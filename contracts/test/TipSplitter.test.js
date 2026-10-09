import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;
const usd = (n) => ethers.parseUnits(String(n), 18);

describe("TipSplitter", () => {
  async function setup() {
    const [owner, customer, stranger, sam, ama, kai, lee] = await ethers.getSigners();
    const ausd = await (await ethers.getContractFactory("MockAUSD")).deploy();
    const splitter = await (await ethers.getContractFactory("TipSplitter")).deploy(await ausd.getAddress(), owner.address);
    await splitter.updatePolicy(60, 30, 10);
    await ausd.mint(customer.address, usd(1000));
    return { ausd, splitter, owner, customer, stranger, sam, ama, kai, lee };
  }

  it("saves and reads the whole team in one call", async () => {
    const { splitter, sam, ama, kai } = await setup();
    await splitter.setTeam(["Sam", "Ama", "Kai"], [sam.address, ama.address, kai.address], [0, 0, 1]);
    const team = await splitter.getTeam();
    expect(team.map((m) => m.name)).to.deep.equal(["Sam", "Ama", "Kai"]);
    expect(team.map((m) => Number(m.group))).to.deep.equal([0, 0, 1]);
    expect(await splitter.employeeWallets("Kai")).to.equal(kai.address);
  });

  it("replaces the team, forgetting people who left", async () => {
    const { splitter, sam, ama, kai } = await setup();
    await splitter.setTeam(["Sam", "Ama"], [sam.address, ama.address], [0, 2]);
    await splitter.setTeam(["Kai"], [kai.address], [1]);
    expect((await splitter.getTeam()).length).to.equal(1);
    expect(await splitter.employeeWallets("Sam")).to.equal(ethers.ZeroAddress);
  });

  it("refuses duplicate names, bad groups and strangers", async () => {
    const { splitter, stranger, sam, ama } = await setup();
    await expect(splitter.setTeam(["Sam", "Sam"], [sam.address, ama.address], [0, 0])).to.be.revertedWith("Duplicate name");
    await expect(splitter.setTeam(["Sam"], [sam.address], [3])).to.be.revertedWith("Bad group");
    await expect(splitter.connect(stranger).setTeam(["Sam"], [sam.address], [0])).to.be.revertedWith("Not authorized");
    await expect(splitter.connect(stranger).payoutTeam()).to.be.revertedWith("Not authorized");
  });

  it("sends a direct tip 100% to the person", async () => {
    const { ausd, splitter, customer, sam } = await setup();
    await splitter.setTeam(["Sam"], [sam.address], [0]);
    await ausd.connect(customer).approve(await splitter.getAddress(), usd(5));
    await splitter.connect(customer).tipIndividual("Sam", usd(5));
    expect(await ausd.balanceOf(sam.address)).to.equal(usd(5));
  });

  it("pays the pool out by the rule, evenly within each group", async () => {
    const { ausd, splitter, customer, sam, ama, kai, lee } = await setup();
    await splitter.setTeam(["Sam", "Ama", "Kai", "Lee"], [sam.address, ama.address, kai.address, lee.address], [0, 0, 1, 2]);
    await ausd.connect(customer).transfer(await splitter.getAddress(), usd(100));
    await splitter.payoutTeam();
    expect(await ausd.balanceOf(sam.address)).to.equal(usd(30));
    expect(await ausd.balanceOf(ama.address)).to.equal(usd(30));
    expect(await ausd.balanceOf(kai.address)).to.equal(usd(30));
    expect(await ausd.balanceOf(lee.address)).to.equal(usd(10));
    expect(await ausd.balanceOf(await splitter.getAddress())).to.equal(0);
  });

  it("gives an empty group's share to the groups that have people", async () => {
    const { ausd, splitter, customer, sam, kai } = await setup();
    await splitter.setTeam(["Sam", "Kai"], [sam.address, kai.address], [0, 1]); // nobody on the bar
    await ausd.connect(customer).transfer(await splitter.getAddress(), usd(90));
    await splitter.payoutTeam();
    expect(await ausd.balanceOf(sam.address)).to.equal(usd(60));
    expect(await ausd.balanceOf(kai.address)).to.equal(usd(30));
  });

  it("keeps registerEmployee working and visible in the team", async () => {
    const { splitter, sam } = await setup();
    await splitter.registerEmployee("Sam", sam.address);
    expect((await splitter.getTeam())[0].name).to.equal("Sam");
  });

  it("never pays the same tips twice", async () => {
    const { ausd, splitter, customer, sam, kai } = await setup();
    await splitter.setTeam(["Sam", "Kai"], [sam.address, kai.address], [0, 1]);
    await ausd.connect(customer).transfer(await splitter.getAddress(), usd(90));
    await splitter.payoutTeam();
    await expect(splitter.payoutTeam()).to.be.revertedWith("No tips to distribute");
    expect(await ausd.balanceOf(sam.address)).to.equal(usd(60));
    expect(await ausd.balanceOf(kai.address)).to.equal(usd(30));
  });

  it("loses nothing to rounding: a remainder stays in the pool for the next payout", async () => {
    const { ausd, splitter, customer, sam, ama, kai } = await setup();
    await splitter.setTeam(["Sam", "Ama", "Kai"], [sam.address, ama.address, kai.address], [0, 0, 0]);
    const pool = await splitter.getAddress();
    await ausd.connect(customer).transfer(pool, usd(10)); // $10 three ways doesn't divide evenly
    await splitter.payoutTeam();
    const paid = (await ausd.balanceOf(sam.address)) + (await ausd.balanceOf(ama.address)) + (await ausd.balanceOf(kai.address));
    const left = await ausd.balanceOf(pool);
    expect(paid + left).to.equal(usd(10));
    expect(left).to.be.lessThan(3n); // a few units of 10^-18 dollars, not lost
    await ausd.connect(customer).transfer(pool, usd(3));
    await splitter.payoutTeam();
    const after = (await ausd.balanceOf(sam.address)) + (await ausd.balanceOf(ama.address)) + (await ausd.balanceOf(kai.address)) + (await ausd.balanceOf(pool));
    expect(after).to.equal(usd(13));
  });

  it("refuses tips to someone not on the team, empty tips, and more than the guest allowed", async () => {
    const { ausd, splitter, customer, sam } = await setup();
    await splitter.setTeam(["Sam"], [sam.address], [0]);
    await ausd.connect(customer).approve(await splitter.getAddress(), usd(5));
    await expect(splitter.connect(customer).tipIndividual("Nobody", usd(1))).to.be.revertedWith("Employee not registered");
    await expect(splitter.connect(customer).tipIndividual("Sam", 0)).to.be.revertedWith("Amount must be greater than zero");
    await expect(splitter.connect(customer).tipIndividual("Sam", usd(6))).to.be.reverted;
    expect(await ausd.balanceOf(sam.address)).to.equal(0);
  });
});
