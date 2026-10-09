import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;
const coder = ethers.AbiCoder.defaultAbiCoder();
const TYPES = ["address", "bytes32", "uint8", "uint8", "uint8", "string[]", "uint8[]"];
const DESCRIPTION = ethers.keccak256(ethers.toUtf8Bytes("Sam on the floor, Ama in the kitchen, Kai behind the bar. 60/30/10."));
const encode = (pool, split = [60, 30, 10], names = ["Sam", "Ama", "Kai"], groups = [0, 1, 2]) =>
  coder.encode(TYPES, [pool, DESCRIPTION, ...split, names, groups]);

describe("WeepPolicyRegistry", () => {
  async function setup() {
    const [forwarder, stranger, pool] = await ethers.getSigners();
    const registry = await (await ethers.getContractFactory("WeepPolicyRegistry")).deploy(forwarder.address);
    return { registry, forwarder, stranger, pool };
  }

  it("records a report from the Forwarder and emits it", async () => {
    const { registry, pool } = await setup();
    await expect(registry.onReport("0x", encode(pool.address)))
      .to.emit(registry, "PolicyAttested")
      .withArgs(pool.address, DESCRIPTION, 60, 30, 10, ["Sam", "Ama", "Kai"], [0, 1, 2]);
    const p = await registry.policyOf(pool.address);
    expect([p.foh, p.boh, p.bar]).to.deep.equal([60n, 30n, 10n]);
    expect(p.descriptionHash).to.equal(DESCRIPTION);
    expect(p.attestedAt).to.be.greaterThan(0n);
    expect([...p.names]).to.deep.equal(["Sam", "Ama", "Kai"]);
    expect([...p.groups]).to.deep.equal([0n, 1n, 2n]);
  });

  it("refuses anyone but the Forwarder", async () => {
    const { registry, stranger, pool } = await setup();
    await expect(registry.connect(stranger).onReport("0x", encode(pool.address)))
      .to.be.revertedWithCustomError(registry, "InvalidSender")
      .withArgs(stranger.address);
  });

  it("refuses a policy the pool itself would refuse", async () => {
    const { registry, pool } = await setup();
    const bad = [
      encode(ethers.ZeroAddress),
      encode(pool.address, [60, 30, 5]),
      encode(pool.address, [60, 30, 10], [], []),
      encode(pool.address, [60, 30, 10], ["Sam", "Ama"], [0]),
      encode(pool.address, [60, 30, 10], ["Sam"], [3]),
      encode(pool.address, [60, 30, 10], [""], [0]),
      encode(pool.address, [100, 0, 0], Array(101).fill("A"), Array(101).fill(0)),
    ];
    for (const report of bad) await expect(registry.onReport("0x", report)).to.be.revertedWithCustomError(registry, "InvalidPolicy");
    expect((await registry.policyOf(pool.address)).attestedAt).to.equal(0n);
  });

  it("keeps the latest report for each pool", async () => {
    const { registry, pool } = await setup();
    await registry.onReport("0x", encode(pool.address));
    await registry.onReport("0x", encode(pool.address, [100, 0, 0], ["Sam"], [0]));
    const p = await registry.policyOf(pool.address);
    expect([p.foh, p.boh, p.bar]).to.deep.equal([100n, 0n, 0n]);
    expect([...p.names]).to.deep.equal(["Sam"]);
  });

  it("accepts a full team of 100", async () => {
    const { registry, pool } = await setup();
    await registry.onReport("0x", encode(pool.address, [60, 30, 10], Array(100).fill("A"), Array(100).fill(1)));
    expect((await registry.policyOf(pool.address)).names.length).to.equal(100);
  });

  it("says it's a CRE receiver, and needs a Forwarder", async () => {
    const { registry } = await setup();
    expect(await registry.supportsInterface("0x01ffc9a7")).to.equal(true); // IERC165
    const iface = new ethers.Interface(["function onReport(bytes,bytes)"]);
    expect(await registry.supportsInterface(iface.getFunction("onReport").selector)).to.equal(true);
    expect(await registry.supportsInterface("0xffffffff")).to.equal(false);
    const F = await ethers.getContractFactory("WeepPolicyRegistry");
    await expect(F.deploy(ethers.ZeroAddress)).to.be.revertedWith("Forwarder required");
  });
});
