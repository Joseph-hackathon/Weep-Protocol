import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;
const usd = (n) => ethers.parseUnits(String(n), 18);
const BPS = 50n; // 0.5%
const feeOf = (amount) => (amount * BPS) / 10_000n;

describe("WeepPools and TipPool", () => {
  async function setup() {
    const [venue, other, guest, stranger, sam, ama, kai, weep] = await ethers.getSigners();
    const ausd = await (await ethers.getContractFactory("MockAUSD")).deploy();
    const pools = await (await ethers.getContractFactory("WeepPools")).deploy(await ausd.getAddress(), BPS, weep.address);
    await ausd.mint(guest.address, usd(1000));
    const team = [["Sam", "Ama", "Kai"], [sam.address, ama.address, kai.address], [0, 0, 1]];
    const create = async (who = venue, split = [60, 30, 10], t = team) => {
      await pools.connect(who).create(...split, ...t);
      return ethers.getContractAt("TipPool", await pools.poolOf(who.address));
    };
    const approve = async (pool, amount) => ausd.connect(guest).approve(await pool.getAddress(), amount);
    return { ausd, pools, venue, other, guest, stranger, sam, ama, kai, weep, team, create, approve };
  }

  it("creates a business's own pool, with its split, team and Weep's fee, in one transaction", async () => {
    const { ausd, pools, venue, weep } = await setup();
    const predicted = await pools.predict(venue.address);
    await expect(pools.create(70, 30, 0, ["Sam"], [venue.address], [0])).to.emit(pools, "PoolCreated").withArgs(venue.address, predicted);
    const pool = await ethers.getContractAt("TipPool", predicted);
    expect(await pools.poolOf(venue.address)).to.equal(predicted);
    expect(await pools.isPool(predicted)).to.equal(true);
    expect(await pool.owner()).to.equal(venue.address);
    expect([...(await pool.currentPolicy())]).to.deep.equal([70n, 30n, 0n]);
    expect((await pool.getTeam()).map((m) => m.name)).to.deep.equal(["Sam"]);
    expect(await pool.ausdToken()).to.equal(await ausd.getAddress());
    expect(await pool.feeBps()).to.equal(BPS);
    expect(await pool.feeRecipient()).to.equal(weep.address);
  });

  it("gives every business a separate pool, and only one each", async () => {
    const { pools, venue, other, create } = await setup();
    const a = await create(venue);
    const b = await create(other);
    expect(await a.getAddress()).to.not.equal(await b.getAddress());
    expect(await b.owner()).to.equal(other.address);
    await expect(pools.connect(venue).create(60, 30, 10, [], [], [])).to.be.revertedWith("Already has a pool");
  });

  it("lets only the pool's owner change the team and split", async () => {
    const { venue, stranger, sam, create } = await setup();
    const pool = await create();
    await expect(pool.connect(stranger).configure(50, 50, 0, ["Sam"], [sam.address], [0])).to.be.revertedWith("Not authorized");
    await pool.connect(venue).configure(50, 50, 0, ["Sam"], [sam.address], [0]);
    expect((await pool.currentPolicy())[0]).to.equal(50n);
  });

  it("can never be set up twice, and the template itself can't be set up at all", async () => {
    const { pools, stranger, create } = await setup();
    const pool = await create();
    const args = [stranger.address, 100, 0, 0, [], [], []];
    await expect(pool.connect(stranger).initialize(...args)).to.be.revertedWith("Already set up");
    const template = await ethers.getContractAt("TipPool", await pools.implementation());
    await expect(template.initialize(...args)).to.be.revertedWith("Already set up");
  });

  it("refuses a split that isn't 100%, duplicate names, bad groups, and a team over 100 people", async () => {
    const { pools, other, stranger, sam, ama } = await setup();
    await expect(pools.create(60, 30, 20, [], [], [])).to.be.revertedWith("Must sum to 100");
    await expect(pools.create(60, 30, 10, ["Sam", "Sam"], [sam.address, ama.address], [0, 0])).to.be.revertedWith("Duplicate name");
    await expect(pools.create(60, 30, 10, ["Sam"], [sam.address], [3])).to.be.revertedWith("Bad group");
    const people = (n) => Array.from({ length: n }, () => ethers.Wallet.createRandom().address);
    const crew = (n) => [Array.from({ length: n }, (_, i) => `P${i}`), people(n), Array(n).fill(0)];
    await expect(pools.connect(stranger).create(100, 0, 0, ...crew(101))).to.be.revertedWith("Too many people");
    await pools.connect(other).create(100, 0, 0, ...crew(100)); // exactly 100 is fine
  });

  it("sends a tip by name 100% to that person, with Weep's fee paid on top by the guest", async () => {
    const { ausd, guest, sam, weep, create, approve } = await setup();
    const pool = await create();
    const fee = feeOf(usd(5));
    expect(fee).to.equal(usd("0.025")); // 0.5% of $5
    await approve(pool, usd(5) + fee);
    const before = await ausd.balanceOf(guest.address);
    await expect(pool.connect(guest).tipIndividual("Sam", sam.address, usd(5), fee)).to.emit(pool, "IndividualTip").withArgs("Sam", sam.address, usd(5), fee);
    expect(await ausd.balanceOf(sam.address)).to.equal(usd(5));
    expect(before - (await ausd.balanceOf(guest.address))).to.equal(usd(5) + fee);
    expect(await ausd.balanceOf(weep.address)).to.equal(fee);
    expect(await ausd.balanceOf(await pool.getAddress())).to.equal(0);
  });

  it("stops a named tip if that name now points to a different wallet than the guest saw", async () => {
    const { ausd, venue, guest, sam, stranger, create, approve } = await setup();
    const pool = await create();
    await pool.connect(venue).configure(60, 30, 10, ["Sam"], [stranger.address], [0]); // Sam's name repointed
    await approve(pool, usd(10));
    await expect(pool.connect(guest).tipIndividual("Sam", sam.address, usd(5), feeOf(usd(5)))).to.be.revertedWith("Recipient changed");
    expect(await ausd.balanceOf(stranger.address)).to.equal(0);
  });

  it("refuses tips to someone not on the team, empty tips, and a fee other than the one reviewed", async () => {
    const { ausd, guest, sam, create, approve } = await setup();
    const pool = await create();
    await approve(pool, usd(10));
    await expect(pool.connect(guest).tipIndividual("Nobody", sam.address, usd(1), feeOf(usd(1)))).to.be.revertedWith("Employee not registered");
    await expect(pool.connect(guest).tipIndividual("Sam", sam.address, 0, 0)).to.be.revertedWith("Amount must be greater than zero");
    await expect(pool.connect(guest).tipIndividual("Sam", sam.address, usd(1), feeOf(usd(1)) + 1n)).to.be.revertedWith("Fee mismatch");
    await expect(pool.connect(guest).tipTeam(usd(1), 0)).to.be.revertedWith("Fee mismatch");
    await expect(pool.connect(guest).tipTeam(0, 0)).to.be.revertedWith("Amount must be greater than zero");
    expect(await ausd.balanceOf(sam.address)).to.equal(0);
  });

  it("takes a team tip into the pool at 100%, with the fee on top: $10.00 costs the guest $10.05", async () => {
    const { ausd, guest, weep, create, approve } = await setup();
    const pool = await create();
    const fee = feeOf(usd(10));
    expect(fee).to.equal(usd("0.05"));
    await approve(pool, usd(10) + fee);
    await expect(pool.connect(guest).tipTeam(usd(10), fee)).to.emit(pool, "TeamTip").withArgs(guest.address, usd(10), fee);
    expect(await ausd.balanceOf(await pool.getAddress())).to.equal(usd(10));
    expect(await ausd.balanceOf(weep.address)).to.equal(fee);
    expect(await ausd.balanceOf(guest.address)).to.equal(usd(1000) - usd("10.05"));
  });

  it("rounds the fee down", async () => {
    const { create } = await setup();
    const pool = await create();
    expect(await pool.feeFor(199n)).to.equal(0n); // 199 × 50 / 10,000 = 0.995
    expect(await pool.feeFor(usd("0.01"))).to.equal(usd("0.00005"));
  });

  it("keeps the fee fixed: copied once from the factory, no way to change it", async () => {
    const { pools, ausd, weep, create } = await setup();
    const pool = await create();
    expect(await pool.feeBps()).to.equal(await pools.feeBps());
    expect(await pool.feeRecipient()).to.equal(weep.address);
    const writable = pool.interface.fragments.filter((f) => f.type === "function" && !["view", "pure"].includes(f.stateMutability)).map((f) => f.name).sort();
    expect(writable).to.deep.equal(["configure", "initialize", "payoutTeam", "tipIndividual", "tipTeam"]); // none sets a fee
    const Pools = await ethers.getContractFactory("WeepPools");
    await expect(Pools.deploy(await ausd.getAddress(), 101, weep.address)).to.be.revertedWith("Fee too high");
    await expect(Pools.deploy(await ausd.getAddress(), 50, ethers.ZeroAddress)).to.be.revertedWith("No fee recipient");
  });

  it("lets anyone pay the pool out, and it only ever pays the saved team by the split", async () => {
    const { ausd, guest, stranger, sam, ama, kai, create, approve } = await setup();
    const pool = await create(); // Sam and Ama on the floor (60%), Kai in the kitchen (30%), nobody on the bar (10%)
    await approve(pool, usd(100) + feeOf(usd(100)));
    await pool.connect(guest).tipTeam(usd(100), feeOf(usd(100)));
    const strangerBefore = await ausd.balanceOf(stranger.address);
    await expect(pool.connect(stranger).payoutTeam()).to.emit(pool, "TipDistributed");
    const [s, a, k] = await Promise.all([sam, ama, kai].map((p) => ausd.balanceOf(p.address)));
    const left = await ausd.balanceOf(await pool.getAddress());
    expect(s + a + k + left).to.equal(usd(100)); // nothing lost
    expect(s).to.equal(a);
    expect(left).to.be.lessThan(3n);
    expect(await ausd.balanceOf(stranger.address)).to.equal(strangerBefore); // the caller gets nothing
    // Paying out again can't pay anyone twice: with nothing left it refuses; with dust left it moves only dust.
    if (left === 0n) await expect(pool.payoutTeam()).to.be.revertedWith("No tips to distribute");
    else await pool.payoutTeam();
    const after = await Promise.all([sam, ama, kai].map((p) => ausd.balanceOf(p.address)));
    expect(after[0] + after[1] + after[2] - (s + a + k)).to.be.lessThan(3n);
  });

  it("refuses a broken team, and won't pay out with no team or a split that pays nobody on it", async () => {
    const { ausd, pools, other, stranger, guest, sam, venue, create, approve } = await setup();
    await expect(pools.create(60, 30, 10, ["Sam", "Ama"], [sam.address], [0, 0])).to.be.revertedWith("Length mismatch");
    await expect(pools.create(60, 30, 10, [""], [sam.address], [0])).to.be.revertedWith("Empty name");
    await expect(pools.create(60, 30, 10, ["Sam"], [ethers.ZeroAddress], [0])).to.be.revertedWith("No wallet");
    // A pool with nobody on its team keeps its tips until there is a team.
    await pools.connect(other).create(60, 30, 10, [], [], []);
    const empty = await ethers.getContractAt("TipPool", await pools.poolOf(other.address));
    await approve(empty, usd(2));
    await empty.connect(guest).tipTeam(usd(1), feeOf(usd(1)));
    await expect(empty.connect(stranger).payoutTeam()).to.be.revertedWith("No team");
    // Only the bar is staffed, but the bar's share is 0%: nothing can be paid, so nothing moves.
    const pool = await create(venue, [50, 50, 0], [["Sam"], [sam.address], [2]]);
    await approve(pool, usd(2));
    await pool.connect(guest).tipTeam(usd(1), feeOf(usd(1)));
    await expect(pool.payoutTeam()).to.be.revertedWith("Policy pays no one on the team");
    expect(await ausd.balanceOf(await pool.getAddress())).to.equal(usd(1));
  });

  it("changes the split and the whole team in one transaction", async () => {
    const { venue, sam, kai, create } = await setup();
    const pool = await create();
    await pool.connect(venue).configure(40, 40, 20, ["Kai", "Sam"], [kai.address, sam.address], [2, 1]);
    expect((await pool.getTeam()).map((m) => [m.name, Number(m.group)])).to.deep.equal([["Kai", 2], ["Sam", 1]]);
    expect(await pool.employeeWallets("Ama")).to.equal(ethers.ZeroAddress);
  });

  it("can't be drained by a hostile token re-entering a payout", async () => {
    const [venue, guest, sam, weep] = await ethers.getSigners();
    const bad = await (await ethers.getContractFactory("ReentrantToken")).deploy();
    const pools = await (await ethers.getContractFactory("WeepPools")).deploy(await bad.getAddress(), BPS, weep.address);
    await pools.connect(venue).create(100, 0, 0, ["Sam"], [sam.address], [0]);
    const pool = await ethers.getContractAt("TipPool", await pools.poolOf(venue.address));
    await bad.mint(guest.address, usd(100));
    await bad.connect(guest).approve(await pool.getAddress(), usd(100));
    await pool.connect(guest).tipTeam(usd(10), feeOf(usd(10)));
    // Every transfer now tries to start a second payout inside the first.
    await bad.arm(await pool.getAddress(), pool.interface.encodeFunctionData("payoutTeam"));
    await expect(pool.payoutTeam()).to.be.revertedWithCustomError(pool, "ReentrancyGuardReentrantCall");
    expect(await bad.balanceOf(await pool.getAddress())).to.equal(usd(10));
    expect(await bad.balanceOf(sam.address)).to.equal(0);
  });

  it("costs well under a million gas to create a pool with a five-person team", async () => {
    const { pools, venue } = await setup();
    const people = Array.from({ length: 5 }, () => ethers.Wallet.createRandom().address);
    const tx = await pools.connect(venue).create(60, 30, 10, ["Ana", "Ben", "Cy", "Dee", "Eli"], people, [0, 0, 1, 1, 2]);
    const gas = (await tx.wait()).gasUsed;
    console.log(`      gas to create a pool with 5 people: ${gas.toLocaleString()}`);
    expect(gas).to.be.lessThan(1_000_000n);
  });
});
