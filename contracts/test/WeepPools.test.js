import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;
const usd = (n) => ethers.parseUnits(String(n), 18);

describe("WeepPools", () => {
  async function setup() {
    const [venue, other, guest, stranger, sam, ama, kai] = await ethers.getSigners();
    const ausd = await (await ethers.getContractFactory("MockAUSD")).deploy();
    const pools = await (await ethers.getContractFactory("WeepPools")).deploy(await ausd.getAddress());
    await ausd.mint(guest.address, usd(1000));
    const team = [["Sam", "Ama", "Kai"], [sam.address, ama.address, kai.address], [0, 0, 1]];
    const create = async (who = venue, split = [60, 30, 10], t = team) => {
      await pools.connect(who).create(...split, ...t);
      return ethers.getContractAt("TipPool", await pools.poolOf(who.address));
    };
    return { ausd, pools, venue, other, guest, stranger, sam, ama, kai, team, create };
  }

  it("creates a business's own pool, with its split and team, in one transaction", async () => {
    const { pools, venue } = await setup();
    const predicted = await pools.predict(venue.address);
    await expect(pools.create(70, 30, 0, ["Sam"], [venue.address], [0])).to.emit(pools, "PoolCreated").withArgs(venue.address, predicted);
    const pool = await ethers.getContractAt("TipPool", predicted);
    expect(await pools.poolOf(venue.address)).to.equal(predicted);
    expect(await pools.isPool(predicted)).to.equal(true);
    expect(await pool.owner()).to.equal(venue.address);
    const [foh, boh, bar] = await pool.currentPolicy();
    expect([foh, boh, bar]).to.deep.equal([70n, 30n, 0n]);
    expect((await pool.getTeam()).map((m) => m.name)).to.deep.equal(["Sam"]);
  });

  it("gives every business a separate pool, and only one each", async () => {
    const { pools, venue, other, create } = await setup();
    const a = await create(venue);
    const b = await create(other);
    expect(await a.getAddress()).to.not.equal(await b.getAddress());
    expect(await b.owner()).to.equal(other.address);
    await expect(pools.connect(venue).create(60, 30, 10, [], [], [])).to.be.revertedWith("Already has a pool");
  });

  it("lets only the pool's owner (or the agent it names) change or pay out the pool", async () => {
    const { venue, stranger, other, sam, create } = await setup();
    const pool = await create();
    await expect(pool.connect(stranger).configure(50, 50, 0, ["Sam"], [sam.address], [0])).to.be.revertedWith("Not authorized");
    await expect(pool.connect(stranger).setTeam(["Sam"], [sam.address], [0])).to.be.revertedWith("Not authorized");
    await expect(pool.connect(stranger).updatePolicy(50, 50, 0)).to.be.revertedWith("Not authorized");
    await expect(pool.connect(stranger).payoutTeam()).to.be.revertedWith("Not authorized");
    await expect(pool.connect(stranger).setAgent(stranger.address)).to.be.revertedWith("Not authorized");
    await pool.connect(venue).setAgent(other.address);
    await pool.connect(other).updatePolicy(50, 50, 0);
    expect((await pool.currentPolicy())[0]).to.equal(50n);
  });

  it("can never be set up twice, and the template itself can't be set up at all", async () => {
    const { ausd, pools, stranger, create } = await setup();
    const pool = await create();
    await expect(pool.connect(stranger).initialize(await ausd.getAddress(), stranger.address, 100, 0, 0, [], [], [])).to.be.revertedWith("Already set up");
    const template = await ethers.getContractAt("TipPool", await pools.implementation());
    await expect(template.initialize(await ausd.getAddress(), stranger.address, 100, 0, 0, [], [], [])).to.be.revertedWith("Already set up");
  });

  it("refuses a split that isn't 100%, duplicate names and bad groups", async () => {
    const { pools, sam, ama } = await setup();
    await expect(pools.create(60, 30, 20, [], [], [])).to.be.revertedWith("Must sum to 100");
    await expect(pools.create(60, 30, 10, ["Sam", "Sam"], [sam.address, ama.address], [0, 0])).to.be.revertedWith("Duplicate name");
    await expect(pools.create(60, 30, 10, ["Sam"], [sam.address], [3])).to.be.revertedWith("Bad group");
  });

  it("sends a tip by name 100% to that person, never through the pool", async () => {
    const { ausd, guest, sam, create } = await setup();
    const pool = await create();
    await ausd.connect(guest).approve(await pool.getAddress(), usd(5));
    await pool.connect(guest).tipIndividual("Sam", usd(5));
    expect(await ausd.balanceOf(sam.address)).to.equal(usd(5));
    expect(await ausd.balanceOf(await pool.getAddress())).to.equal(0);
  });

  it("pays team tips out by the split, once, and loses nothing to rounding", async () => {
    const { ausd, guest, sam, ama, kai, create } = await setup();
    const pool = await create(); // Sam and Ama on the floor (60%), Kai in the kitchen (30%), nobody on the bar (10%)
    await ausd.connect(guest).transfer(await pool.getAddress(), usd(100));
    await pool.payoutTeam();
    const [s, a, k] = await Promise.all([sam, ama, kai].map((p) => ausd.balanceOf(p.address)));
    const left = await ausd.balanceOf(await pool.getAddress());
    expect(s + a + k + left).to.equal(usd(100));
    expect(s).to.equal(a);
    expect(left).to.be.lessThan(3n);
    // Paying out again can't pay anyone twice: with nothing left it refuses; with dust left it moves only dust.
    if (left === 0n) await expect(pool.payoutTeam()).to.be.revertedWith("No tips to distribute");
    else await pool.payoutTeam();
    const after = await Promise.all([sam, ama, kai].map((p) => ausd.balanceOf(p.address)));
    expect(after[0] + after[1] + after[2] - (s + a + k)).to.be.lessThan(3n);
  });

  it("changes the split and the whole team in one transaction", async () => {
    const { venue, sam, kai, create } = await setup();
    const pool = await create();
    await pool.connect(venue).configure(40, 40, 20, ["Kai", "Sam"], [kai.address, sam.address], [2, 1]);
    expect((await pool.getTeam()).map((m) => [m.name, Number(m.group)])).to.deep.equal([["Kai", 2], ["Sam", 1]]);
    expect(await pool.employeeWallets("Ama")).to.equal(ethers.ZeroAddress);
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
