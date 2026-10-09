import hre from "hardhat";

/**
 * The live loop, on Monad testnet, against the deployed contracts, with fresh throwaway wallets:
 *   1. a business creates its pool: Sam (floor), Ama (kitchen), Kai (bar), split 60/30/10
 *   2. a guest tips Sam $5 by name            (0.5% fee on top)
 *   3. the guest tips the team $10             (0.5% fee on top)
 *   4. a different wallet pays the team out
 *   5. the guest sends $100 to three people    (0.3% fee on top)
 * Every balance is checked to the unit, and every transaction hash is printed. The deployer funds the
 * throwaway wallets with a little test MON; test dollars come from the AUSD test token's public mint.
 * No private key is printed.
 *
 *   npx hardhat run scripts/live-loop.js --network monadTestnet
 */
const AUSD = "0xcEF38D455529Dbc2e37654452C288C25e18ADea4";
const PAY = process.env.WEEP_PAY || "0x9F24A86a2d35CC9c281Ee87F6A6204aE782BF5F5";
const POOLS = process.env.WEEP_POOLS || "0xd2bd0685941DAe339D9E28224a5a912FBEb56317";
const { ethers } = hre;
const U = (cents) => BigInt(cents) * 10n ** 16n;
const $ = (u) => "$" + ethers.formatUnits(u, 18);
let failed = 0;
const ok = (c, m) => { if (!c) failed++; console.log((c ? "PASS " : "FAIL ") + m); };

async function main() {
  const [deployer] = await ethers.getSigners();
  const fresh = () => ethers.Wallet.createRandom().connect(ethers.provider);
  const business = fresh(), guest = fresh(), payer = fresh();
  const [sam, ama, kai] = [fresh(), fresh(), fresh()].map((w) => w.address);
  const [r1, r2, r3] = [fresh(), fresh(), fresh()].map((w) => w.address);
  for (const [w, mon] of [[business, "0.3"], [guest, "0.4"], [payer, "0.1"]]) {
    await (await deployer.sendTransaction({ to: w.address, value: ethers.parseEther(mon) })).wait();
  }
  const ausd = await ethers.getContractAt(["function mint(address,uint256)", "function balanceOf(address) view returns (uint256)", "function approve(address,uint256) returns (bool)"], AUSD);
  const bal = (a) => ausd.balanceOf(a);
  const pools = await ethers.getContractAt("WeepPools", POOLS);
  const pay = await ethers.getContractAt("WeepPay", PAY);
  const feeTo = await pay.feeRecipient();
  console.log("business", business.address, "· guest", guest.address, "· payer", payer.address);
  console.log("team: Sam", sam, "· Ama", ama, "· Kai", kai);

  // 1. Create the pool
  const created = await pools.connect(business).create(60, 30, 10, ["Sam", "Ama", "Kai"], [sam, ama, kai], [0, 1, 2]);
  await created.wait();
  const poolAt = await pools.poolOf(business.address);
  const pool = await ethers.getContractAt("TipPool", poolAt);
  console.log("\nTX_POOL", created.hash, "· pool", poolAt);
  ok((await pool.owner()) === business.address && (await pool.getTeam()).length === 3, "pool created and owned by the business, team of three");
  ok((await pool.feeBps()) === 50n && (await pool.feeRecipient()) === feeTo, "pool fee 0.5% to Weep's fee recipient");

  await (await ausd.connect(guest).mint(guest.address, U(100_000))).wait();

  // 2. Named tip: $5 to Sam
  let fee = await pool.feeFor(U(500));
  await (await ausd.connect(guest).approve(poolAt, U(500) + fee)).wait();
  let g0 = await bal(guest.address), f0 = await bal(feeTo);
  const named = await pool.connect(guest).tipIndividual("Sam", sam, U(500), fee);
  await named.wait();
  console.log("\nTX_NAMED_TIP", named.hash);
  ok((await bal(sam)) === U(500), `Sam received exactly ${$(U(500))} (100%)`);
  ok(g0 - (await bal(guest.address)) === U(500) + fee, `guest paid ${$(U(500))} + ${$(fee)} fee`);
  ok((await bal(feeTo)) - f0 === fee && fee === U(500) * 50n / 10_000n, `fee exactly ${$(fee)} (0.5%)`);
  ok((await bal(poolAt)) === 0n, "pool kept nothing from the named tip");

  // 3. Team tip: $10
  fee = await pool.feeFor(U(1000));
  await (await ausd.connect(guest).approve(poolAt, U(1000) + fee)).wait();
  g0 = await bal(guest.address); f0 = await bal(feeTo);
  const team = await pool.connect(guest).tipTeam(U(1000), fee);
  await team.wait();
  console.log("\nTX_TEAM_TIP", team.hash);
  ok((await bal(poolAt)) === U(1000), "pool holds exactly $10.00 (100% of the tip)");
  ok(g0 - (await bal(guest.address)) === U(1000) + fee && fee === U(5), `guest paid $10.00 + ${$(fee)} fee`);
  ok((await bal(feeTo)) - f0 === fee, "fee went to Weep's fee recipient");

  // 4. A different wallet pays out
  const before = await Promise.all([sam, ama, kai, payer.address].map(bal));
  const payout = await pool.connect(payer).payoutTeam();
  await payout.wait();
  const after = await Promise.all([sam, ama, kai, payer.address].map(bal));
  const got = after.map((x, i) => x - before[i]);
  console.log("\nTX_PAYOUT", payout.hash, "· Sam", $(got[0]), "· Ama", $(got[1]), "· Kai", $(got[2]));
  ok(got[0] === U(600) && got[1] === U(300) && got[2] === U(100), "payout exact: Sam $6.00, Ama $3.00, Kai $1.00 (60/30/10)");
  ok(got[3] === 0n, "the wallet that paid out received nothing");
  ok((await bal(poolAt)) === 0n, "pool empty after payout");
  ok((await bal(sam)) === U(1100), "Sam holds $11.00 in total ($5 named + $6 team)");

  // 5. Send $100 to three people
  const amounts = [U(3334), U(3333), U(3333)];
  fee = await pay.feeFor(U(10000));
  await (await ausd.connect(guest).approve(PAY, U(10000) + fee)).wait();
  g0 = await bal(guest.address); f0 = await bal(feeTo);
  const send = await pay.connect(guest).pay([r1, r2, r3], amounts, U(10000), fee, ethers.id("live-loop"));
  await send.wait();
  console.log("\nTX_SEND", send.hash);
  const recv = await Promise.all([r1, r2, r3].map(bal));
  ok(recv[0] === U(3334) && recv[1] === U(3333) && recv[2] === U(3333), "Send: $33.34 / $33.33 / $33.33 received (100%)");
  ok(g0 - (await bal(guest.address)) === U(10000) + fee && fee === U(30), "sender paid $100.00 + $0.30 fee");
  ok((await bal(feeTo)) - f0 === fee, "fee went to Weep's fee recipient");
  ok((await bal(PAY)) === 0n, "WeepPay kept nothing");

  console.log(`\nSAM ${sam}\nPOOL ${poolAt}\n${failed ? `${failed} CHECK(S) FAILED` : "ALL CHECKS PASSED"}`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
