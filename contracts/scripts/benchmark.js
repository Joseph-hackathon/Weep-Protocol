import hre from "hardhat";

/**
 * Measures Weep on Monad testnet with real transactions, using the deployer wallet:
 *   - pool payouts to 10, 50 and 100 team members (one pool, re-configured for each size), RUNS times each
 *   - a Send to 20 people through WeepPay, RUNS times
 * For every transaction: gas used, the MON actually charged (the sender's balance change), and the time from
 * submitting it to its receipt, polled every 200 ms. Every recipient is a fresh, never-used address (the costliest
 * case). Prints a Markdown table and a JSON line for docs/benchmarks.md.
 *
 *   RUNS=3 npx hardhat run scripts/benchmark.js --network monadTestnet   (WEEP_PAY / WEEP_POOLS default to the live contracts)
 *
 * Costs roughly 2–4 test MON at current testnet gas prices. Needs PRIVATE_KEY in contracts/.env.
 */
const AUSD = "0xcEF38D455529Dbc2e37654452C288C25e18ADea4";
const SIZES = [10, 50, 100];
const SEND_PEOPLE = 20;
const usd = (n) => hre.ethers.parseUnits(String(n), 18);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const fresh = (n) => Array.from({ length: n }, () => hre.ethers.Wallet.createRandom().address);

async function timed(me, send) {
  const provider = hre.ethers.provider;
  const before = await provider.getBalance(me.address);
  const start = Date.now();
  const tx = await send();
  let receipt = null;
  while (!(receipt = await provider.getTransactionReceipt(tx.hash))) await sleep(200);
  const ms = Date.now() - start;
  if (receipt.status !== 1) throw new Error(`Transaction ${tx.hash} reverted`);
  const after = await provider.getBalance(me.address);
  return { hash: tx.hash, block: receipt.blockNumber, gas: Number(receipt.gasUsed), mon: Number(hre.ethers.formatEther(before - after)), ms };
}

async function main() {
  const RUNS = Number(process.env.RUNS || 3);
  const WEEP_PAY = process.env.WEEP_PAY || "0x9F24A86a2d35CC9c281Ee87F6A6204aE782BF5F5";
  const WEEP_POOLS = process.env.WEEP_POOLS || "0xd2bd0685941DAe339D9E28224a5a912FBEb56317";
  if (!hre.ethers.isAddress(WEEP_PAY ?? "") || !hre.ethers.isAddress(WEEP_POOLS ?? "")) throw new Error("Set WEEP_PAY and WEEP_POOLS to the deployed addresses.");
  const [me] = await hre.ethers.getSigners();
  const net = await hre.ethers.provider.getNetwork();
  const ausd = await hre.ethers.getContractAt(["function mint(address,uint256)", "function approve(address,uint256) returns (bool)"], AUSD);
  const pay = await hre.ethers.getContractAt("WeepPay", WEEP_PAY);
  const pools = await hre.ethers.getContractAt("WeepPools", WEEP_POOLS);
  console.log(`Benchmark on chain ${net.chainId} from ${me.address}, ${RUNS} run(s) each, started ${new Date().toISOString()}`);

  await (await ausd.mint(me.address, usd(100_000))).wait();
  const results = [];

  // Pool payouts: one pool, re-configured to each team size; every run pays a fresh team.
  for (const n of SIZES) {
    for (let r = 0; r < RUNS; r++) {
      const team = fresh(n);
      const names = team.map((_, i) => `M${i}`);
      const groups = team.map((_, i) => i % 3);
      let poolAt = await pools.poolOf(me.address);
      if (poolAt === hre.ethers.ZeroAddress) {
        await (await pools.create(60, 30, 10, names, team, groups)).wait();
        poolAt = await pools.poolOf(me.address);
      } else {
        const p = await hre.ethers.getContractAt("TipPool", poolAt);
        await (await p.configure(60, 30, 10, names, team, groups)).wait();
      }
      const pool = await hre.ethers.getContractAt("TipPool", poolAt);
      const tip = usd(n); // $1 a person
      const fee = await pool.feeFor(tip);
      await (await ausd.approve(poolAt, tip + fee)).wait();
      await (await pool.tipTeam(tip, fee)).wait();
      const m = await timed(me, () => pool.payoutTeam());
      results.push({ what: `Pool payout to ${n} people`, n, ...m });
      console.log(`  payout ${n} · run ${r + 1}: ${m.gas.toLocaleString()} gas · ${m.mon} MON · ${m.ms} ms · ${m.hash}`);
    }
  }

  // Send: one WeepPay payment to 20 fresh people, $1 each, with the 0.3% fee on top.
  for (let r = 0; r < RUNS; r++) {
    const to = fresh(SEND_PEOPLE);
    const amounts = to.map(() => usd(1));
    const total = usd(SEND_PEOPLE);
    const fee = await pay.feeFor(total);
    await (await ausd.approve(WEEP_PAY, total + fee)).wait();
    const m = await timed(me, () => pay.pay(to, amounts, total, fee, hre.ethers.ZeroHash));
    results.push({ what: `Send to ${SEND_PEOPLE} people`, n: SEND_PEOPLE, ...m });
    console.log(`  send ${SEND_PEOPLE} · run ${r + 1}: ${m.gas.toLocaleString()} gas · ${m.mon} MON · ${m.ms} ms · ${m.hash}`);
  }

  console.log("\n| Transaction | Runs | Gas used (median) | MON charged (median) | Submit → receipt (median, min–max) |");
  console.log("|---|---|---|---|---|");
  for (const what of [...new Set(results.map((x) => x.what))]) {
    const xs = results.filter((x) => x.what === what);
    const ms = xs.map((x) => x.ms);
    console.log(`| ${what} | ${xs.length} | ${median(xs.map((x) => x.gas)).toLocaleString()} | ${median(xs.map((x) => x.mon))} | ${median(ms)} ms (${Math.min(...ms)}–${Math.max(...ms)}) |`);
  }
  console.log("\nJSON " + JSON.stringify({ chainId: Number(net.chainId), finished: new Date().toISOString(), runs: RUNS, results }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
