import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;
const usd = (n) => ethers.parseUnits(String(n), 18);

describe("WeepPay", () => {
  async function setup() {
    const [sender, stranger] = await ethers.getSigners();
    const ausd = await (await ethers.getContractFactory("MockAUSD")).deploy();
    const pay = await (await ethers.getContractFactory("WeepPay")).deploy(await ausd.getAddress());
    await ausd.mint(sender.address, usd(1_000_000));
    // Fresh wallets nobody has used, like real winners or new team members.
    const people = (n) => Array.from({ length: n }, () => ethers.Wallet.createRandom().address);
    return { ausd, pay, sender, stranger, people };
  }
  const allow = async (ausd, pay, who, amount) => ausd.connect(who).approve(await pay.getAddress(), amount);
  const balances = (ausd, list) => Promise.all(list.map((a) => ausd.balanceOf(a)));

  it("pays 20 winners exactly, in one transaction: five get $200, fifteen share the rest", async () => {
    const { ausd, pay, sender, people } = await setup();
    const to = people(20);
    const rest = usd(1000);
    const each = rest / 15n;
    const amounts = to.map((_, i) => (i < 5 ? usd(200) : i === 19 ? rest - each * 14n : each)); // remainder to the last
    const total = amounts.reduce((a, b) => a + b, 0n);
    expect(total).to.equal(usd(2000));
    await allow(ausd, pay, sender, total);
    await expect(pay.pay(to, amounts, total, ethers.id("winners"))).to.emit(pay, "Paid").withArgs(sender.address, ethers.id("winners"), total, 20);
    expect(await balances(ausd, to)).to.deep.equal(amounts);
    expect(await ausd.balanceOf(await pay.getAddress())).to.equal(0);
  });

  it("lands in full or not at all: one bad recipient reverts every transfer", async () => {
    const { ausd, pay, sender, people } = await setup();
    const to = [...people(9), ethers.ZeroAddress];
    const amounts = to.map(() => usd(10));
    await allow(ausd, pay, sender, usd(100));
    await expect(pay.pay(to, amounts, usd(100), ethers.ZeroHash)).to.be.revertedWith("No wallet");
    expect(await balances(ausd, to.slice(0, 9))).to.deep.equal(Array(9).fill(0n));
  });

  it("moves nothing when the sender hasn't allowed the full total", async () => {
    const { ausd, pay, sender, people } = await setup();
    const to = people(5);
    await allow(ausd, pay, sender, usd(40)); // short by $10
    await expect(pay.pay(to, to.map(() => usd(10)), usd(50), ethers.ZeroHash)).to.be.reverted;
    expect(await balances(ausd, to)).to.deep.equal(Array(5).fill(0n));
  });

  it("refuses a payment whose parts don't add up to the reviewed total", async () => {
    const { ausd, pay, sender, people } = await setup();
    const to = people(3);
    await allow(ausd, pay, sender, usd(100));
    await expect(pay.pay(to, [usd(10), usd(10), usd(10)], usd(31), ethers.ZeroHash)).to.be.revertedWith("Total mismatch");
    expect(await balances(ausd, to)).to.deep.equal([0n, 0n, 0n]);
  });

  it("refuses empty, mismatched, zero-amount and oversized payments", async () => {
    const { ausd, pay, sender, people } = await setup();
    await allow(ausd, pay, sender, usd(10_000));
    await expect(pay.pay([], [], 0, ethers.ZeroHash)).to.be.revertedWith("Recipients");
    await expect(pay.pay(people(2), [usd(1)], usd(1), ethers.ZeroHash)).to.be.revertedWith("Length mismatch");
    await expect(pay.pay(people(2), [usd(1), 0], usd(1), ethers.ZeroHash)).to.be.revertedWith("Zero amount");
    const many = people(101);
    await expect(pay.pay(many, many.map(() => 1n), 101n, ethers.ZeroHash)).to.be.revertedWith("Recipients");
  });

  it("only ever moves the sender's own money", async () => {
    const { ausd, pay, sender, stranger, people } = await setup();
    const before = await ausd.balanceOf(sender.address);
    await allow(ausd, pay, sender, usd(100)); // the sender's allowance can't be spent by someone else
    await expect(pay.connect(stranger).pay(people(1), [usd(5)], usd(5), ethers.ZeroHash)).to.be.reverted;
    expect(await ausd.balanceOf(sender.address)).to.equal(before);
  });

  it("stays well inside the block gas limit at 20, 50 and 100 recipients", async () => {
    const { ausd, pay, sender, people } = await setup();
    await allow(ausd, pay, sender, usd(1_000_000));
    for (const n of [1, 20, 50, 100]) {
      const to = people(n);
      const tx = await pay.pay(to, to.map(() => usd(1)), usd(n), ethers.ZeroHash);
      const gas = (await tx.wait()).gasUsed;
      console.log(`      gas for ${n} new recipients: ${gas.toLocaleString()}`);
      expect(gas).to.be.lessThan(5_000_000n);
    }
  });

  it("moves nothing when the sender's balance can't cover the total", async () => {
    const { ausd, pay, stranger, people } = await setup();
    await ausd.mint(stranger.address, usd(20));
    await allow(ausd, pay, stranger, usd(30));
    const to = people(3);
    await expect(pay.connect(stranger).pay(to, to.map(() => usd(10)), usd(30), ethers.ZeroHash)).to.be.reverted;
    expect(await balances(ausd, to)).to.deep.equal([0n, 0n, 0n]);
    expect(await ausd.balanceOf(stranger.address)).to.equal(usd(20));
  });

  it("can't be paid twice from one approval: the exact allowance is spent by the first payment", async () => {
    const { ausd, pay, sender, people } = await setup();
    const to = people(2);
    await allow(ausd, pay, sender, usd(20)); // what Weep approves: exactly the reviewed total
    await pay.pay(to, [usd(10), usd(10)], usd(20), ethers.ZeroHash);
    await expect(pay.pay(to, [usd(10), usd(10)], usd(20), ethers.ZeroHash)).to.be.reverted;
    expect(await balances(ausd, to)).to.deep.equal([usd(10), usd(10)]);
  });
});
