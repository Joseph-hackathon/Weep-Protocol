import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;
const usd = (n) => ethers.parseUnits(String(n), 18);

describe("WeepVenues", () => {
  async function setup() {
    const [cafe, bar, customer, stranger, sam, ama, kai, lee] = await ethers.getSigners();
    const ausd = await (await ethers.getContractFactory("MockAUSD")).deploy();
    const weep = await (await ethers.getContractFactory("WeepVenues")).deploy(await ausd.getAddress());
    await ausd.mint(customer.address, usd(1000));
    await ausd.connect(customer).approve(await weep.getAddress(), ethers.MaxUint256);
    return { ausd, weep, cafe, bar, customer, stranger, sam, ama, kai, lee };
  }
  const open = (weep, who, name, split, people) =>
    weep.connect(who).createVenue(name, split, people.map((p) => p[0]), people.map((p) => p[1].address), people.map((p) => p[2]));

  it("lets any business open its own venue, in one transaction", async () => {
    const { weep, cafe, bar, sam, kai, lee } = await setup();
    await open(weep, cafe, "Corner Cafe", [60, 30, 10], [["Sam", sam, 0], ["Kai", kai, 1]]);
    await open(weep, bar, "Night Bar", [0, 0, 100], [["Lee", lee, 2]]);
    expect(await weep.venueCount()).to.equal(2);
    const v = await weep.getVenue(0);
    expect(v.name).to.equal("Corner Cafe");
    expect(v.admin).to.equal(cafe.address);
    expect(v.split.map(Number)).to.deep.equal([60, 30, 10]);
    expect(v.team.map((m) => m.name)).to.deep.equal(["Sam", "Kai"]);
    expect((await weep.venuesOf(bar.address)).map(Number)).to.deep.equal([1]);
  });

  it("only a venue's admin can change it", async () => {
    const { weep, cafe, stranger, sam, kai } = await setup();
    await open(weep, cafe, "Corner Cafe", [60, 30, 10], [["Sam", sam, 0]]);
    await expect(weep.connect(stranger).updateVenue(0, "Mine", [100, 0, 0], ["Kai"], [kai.address], [0])).to.be.revertedWith("Not your venue");
    await expect(weep.connect(stranger).setAdmin(0, stranger.address)).to.be.revertedWith("Not your venue");
    await weep.connect(cafe).updateVenue(0, "Corner Cafe", [50, 50, 0], ["Sam", "Kai"], [sam.address, kai.address], [0, 1]);
    expect((await weep.getVenue(0)).team.length).to.equal(2);
  });

  it("refuses bad setups", async () => {
    const { weep, cafe, sam, ama } = await setup();
    await expect(open(weep, cafe, "X", [60, 30, 5], [["Sam", sam, 0]])).to.be.revertedWith("Split must sum to 100");
    await expect(open(weep, cafe, "X", [60, 30, 10], [["Sam", sam, 0], ["Sam", ama, 1]])).to.be.revertedWith("Duplicate name");
    await expect(open(weep, cafe, "X", [60, 30, 10], [["Sam", sam, 3]])).to.be.revertedWith("Bad group");
    await expect(open(weep, cafe, "", [60, 30, 10], [["Sam", sam, 0]])).to.be.revertedWith("Bad venue name");
    await expect(open(weep, cafe, "X", [60, 30, 10], [])).to.be.revertedWith("Team size");
  });

  it("pays a team tip straight into every wallet, by the rule", async () => {
    const { ausd, weep, cafe, customer, sam, ama, kai, lee } = await setup();
    await open(weep, cafe, "Corner Cafe", [60, 30, 10], [["Sam", sam, 0], ["Ama", ama, 0], ["Kai", kai, 1], ["Lee", lee, 2]]);
    await weep.connect(customer).tipTeam(0, usd(100));
    expect(await ausd.balanceOf(sam.address)).to.equal(usd(30));
    expect(await ausd.balanceOf(ama.address)).to.equal(usd(30));
    expect(await ausd.balanceOf(kai.address)).to.equal(usd(30));
    expect(await ausd.balanceOf(lee.address)).to.equal(usd(10));
    expect(await ausd.balanceOf(await weep.getAddress())).to.equal(0);
    expect((await weep.getVenue(0)).tipped).to.equal(usd(100));
  });

  it("gives an empty group's share to the others, and loses no cent to rounding", async () => {
    const { ausd, weep, cafe, customer, sam, ama, kai } = await setup();
    await open(weep, cafe, "Corner Cafe", [60, 30, 10], [["Sam", sam, 0], ["Ama", ama, 0], ["Kai", kai, 1]]); // nobody on the bar
    const before = await ausd.balanceOf(customer.address);
    await weep.connect(customer).tipTeam(0, usd(10));
    const paid = (await ausd.balanceOf(sam.address)) + (await ausd.balanceOf(ama.address)) + (await ausd.balanceOf(kai.address));
    expect(paid).to.equal(usd(10));
    expect(before - (await ausd.balanceOf(customer.address))).to.equal(usd(10));
    expect(await ausd.balanceOf(sam.address)).to.be.closeTo(usd("3.333333333333333333"), 2);
  });

  it("sends a tip by name 100% to that person", async () => {
    const { ausd, weep, cafe, customer, sam, kai } = await setup();
    await open(weep, cafe, "Corner Cafe", [60, 30, 10], [["Sam", sam, 0], ["Kai", kai, 1]]);
    await weep.connect(customer).tipPerson(0, "Kai", usd(5));
    expect(await ausd.balanceOf(kai.address)).to.equal(usd(5));
    expect(await ausd.balanceOf(sam.address)).to.equal(0);
    await expect(weep.connect(customer).tipPerson(0, "Nobody", usd(1))).to.be.revertedWith("No one by that name");
  });

  it("never holds money and can't be tipped without approval", async () => {
    const { ausd, weep, cafe, stranger, sam } = await setup();
    await open(weep, cafe, "Corner Cafe", [100, 0, 0], [["Sam", sam, 0]]);
    await ausd.mint(stranger.address, usd(5));
    await expect(weep.connect(stranger).tipTeam(0, usd(5))).to.be.reverted;
    await expect(weep.connect(stranger).tipTeam(9, usd(5))).to.be.revertedWith("No such venue");
  });
});
