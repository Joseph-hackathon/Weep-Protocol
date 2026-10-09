import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;
const usd = (n) => ethers.parseUnits(String(n), 18);
const BPS = 30n; // 0.3%
const feeOf = (total) => (total * BPS) / 10_000n;

describe("WeepPay", () => {
  async function setup() {
    const [sender, stranger, weep] = await ethers.getSigners();
    const ausd = await (await ethers.getContractFactory("MockAUSD")).deploy();
    const pay = await (await ethers.getContractFactory("WeepPay")).deploy(await ausd.getAddress(), BPS, weep.address);
    await ausd.mint(sender.address, usd(1_000_000));
    // Fresh wallets nobody has used, like real winners or new team members.
    const people = (n) => Array.from({ length: n }, () => ethers.Wallet.createRandom().address);
    return { ausd, pay, sender, stranger, weep, people };
  }
  const allow = async (ausd, pay, who, amount) => ausd.connect(who).approve(await pay.getAddress(), amount);
  const balances = (ausd, list) => Promise.all(list.map((a) => ausd.balanceOf(a)));

  it("pays 20 winners exactly, in one transaction: five get $200, fifteen share the rest", async () => {
    const { ausd, pay, sender, weep, people } = await setup();
    const to = people(20);
    const rest = usd(1000);
    const each = rest / 15n;
    const amounts = to.map((_, i) => (i < 5 ? usd(200) : i === 19 ? rest - each * 14n : each)); // remainder to the last
    const total = amounts.reduce((a, b) => a + b, 0n);
    expect(total).to.equal(usd(2000));
    const fee = feeOf(total);
    expect(fee).to.equal(usd(6)); // 0.3% of $2,000
    await allow(ausd, pay, sender, total + fee);
    const before = await ausd.balanceOf(sender.address);
    await expect(pay.pay(to, amounts, total, fee, ethers.id("winners"))).to.emit(pay, "Paid").withArgs(sender.address, ethers.id("winners"), total, fee, 20);
    expect(await balances(ausd, to)).to.deep.equal(amounts); // recipients get 100%
    expect(before - (await ausd.balanceOf(sender.address))).to.equal(total + fee); // payer pays amount + fee
    expect(await ausd.balanceOf(weep.address)).to.equal(fee);
    expect(await ausd.balanceOf(await pay.getAddress())).to.equal(0); // holds nothing
  });

  it("lands in full or not at all: one bad recipient reverts every transfer, fee included", async () => {
    const { ausd, pay, sender, weep, people } = await setup();
    const to = [...people(9), ethers.ZeroAddress];
    const amounts = to.map(() => usd(10));
    await allow(ausd, pay, sender, usd(101));
    await expect(pay.pay(to, amounts, usd(100), feeOf(usd(100)), ethers.ZeroHash)).to.be.revertedWith("No wallet");
    expect(await balances(ausd, to.slice(0, 9))).to.deep.equal(Array(9).fill(0n));
    expect(await ausd.balanceOf(weep.address)).to.equal(0);
  });

  it("moves nothing when the sender allowed the payment but not the fee on top", async () => {
    const { ausd, pay, sender, weep, people } = await setup();
    const to = people(5);
    await allow(ausd, pay, sender, usd(50)); // the total, without the fee
    await expect(pay.pay(to, to.map(() => usd(10)), usd(50), feeOf(usd(50)), ethers.ZeroHash)).to.be.reverted;
    expect(await balances(ausd, to)).to.deep.equal(Array(5).fill(0n));
    expect(await ausd.balanceOf(weep.address)).to.equal(0);
  });

  it("refuses a payment whose parts don't add up to the reviewed total", async () => {
    const { ausd, pay, sender, people } = await setup();
    const to = people(3);
    await allow(ausd, pay, sender, usd(100));
    await expect(pay.pay(to, [usd(10), usd(10), usd(10)], usd(31), feeOf(usd(31)), ethers.ZeroHash)).to.be.revertedWith("Total mismatch");
    expect(await balances(ausd, to)).to.deep.equal([0n, 0n, 0n]);
  });

  it("refuses a fee that isn't the one the sender reviewed", async () => {
    const { ausd, pay, sender, people } = await setup();
    const to = people(2);
    await allow(ausd, pay, sender, usd(100));
    const fee = feeOf(usd(20));
    await expect(pay.pay(to, [usd(10), usd(10)], usd(20), fee + 1n, ethers.ZeroHash)).to.be.revertedWith("Fee mismatch");
    await expect(pay.pay(to, [usd(10), usd(10)], usd(20), fee - 1n, ethers.ZeroHash)).to.be.revertedWith("Fee mismatch");
    expect(await balances(ausd, to)).to.deep.equal([0n, 0n]);
  });

  it("rounds the fee down", async () => {
    const { ausd, pay, sender, weep, people } = await setup();
    const to = people(1);
    await allow(ausd, pay, sender, usd(10));
    // 333 base units: 333 × 30 / 10,000 = 0.999, so no fee at all
    expect(await pay.feeFor(333n)).to.equal(0n);
    await pay.pay(to, [333n], 333n, 0n, ethers.ZeroHash);
    expect(await ausd.balanceOf(weep.address)).to.equal(0n);
    // $33.33: 0.3% is $0.09999 exactly, never rounded up to $0.10
    expect(await pay.feeFor(usd("33.33"))).to.equal(usd("0.09999"));
  });

  it("keeps its fee fixed: set at deployment, no way to change it", async () => {
    const { pay, weep } = await setup();
    expect(await pay.feeBps()).to.equal(BPS);
    expect(await pay.feeRecipient()).to.equal(weep.address);
    const writable = pay.interface.fragments.filter((f) => f.type === "function" && !["view", "pure"].includes(f.stateMutability)).map((f) => f.name);
    expect(writable).to.deep.equal(["pay"]); // the only function that changes anything is paying
  });

  it("refuses a fee above 1% and a fee with nobody to receive it", async () => {
    const { ausd, weep } = await setup();
    const Pay = await ethers.getContractFactory("WeepPay");
    await expect(Pay.deploy(await ausd.getAddress(), 101, weep.address)).to.be.revertedWith("Fee too high");
    await expect(Pay.deploy(await ausd.getAddress(), 30, ethers.ZeroAddress)).to.be.revertedWith("No fee recipient");
    await Pay.deploy(await ausd.getAddress(), 0, ethers.ZeroAddress); // no fee, no recipient: allowed
  });

  it("refuses empty, mismatched, zero-amount and oversized payments", async () => {
    const { ausd, pay, sender, people } = await setup();
    await allow(ausd, pay, sender, usd(10_000));
    await expect(pay.pay([], [], 0, 0, ethers.ZeroHash)).to.be.revertedWith("Recipients");
    await expect(pay.pay(people(2), [usd(1)], usd(1), feeOf(usd(1)), ethers.ZeroHash)).to.be.revertedWith("Length mismatch");
    await expect(pay.pay(people(2), [usd(1), 0], usd(1), feeOf(usd(1)), ethers.ZeroHash)).to.be.revertedWith("Zero amount");
    const many = people(101);
    await expect(pay.pay(many, many.map(() => 1n), 101n, 0n, ethers.ZeroHash)).to.be.revertedWith("Recipients");
  });

  it("only ever moves the sender's own money", async () => {
    const { ausd, pay, sender, stranger, people } = await setup();
    const before = await ausd.balanceOf(sender.address);
    await allow(ausd, pay, sender, usd(100)); // the sender's allowance can't be spent by someone else
    await expect(pay.connect(stranger).pay(people(1), [usd(5)], usd(5), feeOf(usd(5)), ethers.ZeroHash)).to.be.reverted;
    expect(await ausd.balanceOf(sender.address)).to.equal(before);
  });

  it("moves nothing when the sender's balance can't cover the total and fee", async () => {
    const { ausd, pay, stranger, people } = await setup();
    await ausd.mint(stranger.address, usd(30)); // exactly the total, nothing for the fee
    await allow(ausd, pay, stranger, usd(40));
    const to = people(3);
    await expect(pay.connect(stranger).pay(to, to.map(() => usd(10)), usd(30), feeOf(usd(30)), ethers.ZeroHash)).to.be.reverted;
    expect(await balances(ausd, to)).to.deep.equal([0n, 0n, 0n]);
    expect(await ausd.balanceOf(stranger.address)).to.equal(usd(30));
  });

  it("can't be paid twice from one approval: the exact allowance is spent by the first payment", async () => {
    const { ausd, pay, sender, people } = await setup();
    const to = people(2);
    const fee = feeOf(usd(20));
    await allow(ausd, pay, sender, usd(20) + fee); // what Weep approves: exactly the total plus the fee
    await pay.pay(to, [usd(10), usd(10)], usd(20), fee, ethers.ZeroHash);
    await expect(pay.pay(to, [usd(10), usd(10)], usd(20), fee, ethers.ZeroHash)).to.be.reverted;
    expect(await balances(ausd, to)).to.deep.equal([usd(10), usd(10)]);
  });

  it("can't be re-entered by a hostile token", async () => {
    const [sender, , weep] = await ethers.getSigners();
    const bad = await (await ethers.getContractFactory("ReentrantToken")).deploy();
    const pay = await (await ethers.getContractFactory("WeepPay")).deploy(await bad.getAddress(), BPS, weep.address);
    await bad.mint(sender.address, usd(1000));
    await bad.approve(await pay.getAddress(), usd(1000));
    const to = [ethers.Wallet.createRandom().address];
    // On its first transfer, the token tries to run a second payment inside the first.
    await bad.arm(await pay.getAddress(), pay.interface.encodeFunctionData("pay", [to, [usd(10)], usd(10), feeOf(usd(10)), ethers.ZeroHash]));
    await expect(pay.pay(to, [usd(10)], usd(10), feeOf(usd(10)), ethers.ZeroHash)).to.be.revertedWithCustomError(pay, "ReentrancyGuardReentrantCall");
    expect(await bad.balanceOf(to[0])).to.equal(0);
  });

  it("stays well inside the block gas limit at 20, 50 and 100 recipients", async () => {
    const { ausd, pay, sender, people } = await setup();
    await allow(ausd, pay, sender, usd(1_000_000));
    for (const n of [1, 20, 50, 100]) {
      const to = people(n);
      const tx = await pay.pay(to, to.map(() => usd(1)), usd(n), feeOf(usd(n)), ethers.ZeroHash);
      const gas = (await tx.wait()).gasUsed;
      console.log(`      gas for ${n} new recipients: ${gas.toLocaleString()}`);
      expect(gas).to.be.lessThan(5_000_000n);
    }
  });
});
