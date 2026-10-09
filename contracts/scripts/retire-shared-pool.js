import hre from "hardhat";

/**
 * Retires the first, shared tip pool (TipSplitter at 0x06db…EA35), which the app no longer uses.
 * Run it from the pool's owner (the PRIVATE_KEY in contracts/.env). It sends whatever the pool still holds,
 * in one payout, to RETURN_TO, by making that address the only team member at 100% and paying out.
 * With nothing in the pool it only reports and does nothing.
 *
 *   RETURN_TO=0x… npx hardhat run scripts/retire-shared-pool.js --network monadTestnet
 */
const POOL = "0x06db4c849EF42653982694Ae924dC99DBB80EA35";
const AUSD = "0xcEF38D455529Dbc2e37654452C288C25e18ADea4";
const ABI = [
  "function owner() view returns (address)",
  "function setTeam(string[] names, address[] wallets, uint8[] groups)",
  "function updatePolicy(uint256 foh, uint256 boh, uint256 bar)",
  "function payoutTeam()",
];

async function main() {
  const to = process.env.RETURN_TO;
  if (!to || !hre.ethers.isAddress(to)) throw new Error("Set RETURN_TO to the address that should receive the pool's remaining test dollars.");
  const [me] = await hre.ethers.getSigners();
  const pool = await hre.ethers.getContractAt(ABI, POOL);
  const ausd = await hre.ethers.getContractAt(["function balanceOf(address) view returns (uint256)"], AUSD);
  if ((await pool.owner()).toLowerCase() !== me.address.toLowerCase()) throw new Error(`Run this from the pool's owner, ${await pool.owner()}.`);
  const left = await ausd.balanceOf(POOL);
  console.log("Shared pool holds", hre.ethers.formatUnits(left, 18), "AUSD (test)");
  if (left === 0n) { console.log("Nothing to move. The pool is retired: the app no longer links to it."); return; }
  await (await pool.setTeam(["Returned"], [to], [0])).wait();
  await (await pool.updatePolicy(100, 0, 0)).wait();
  const tx = await pool.payoutTeam();
  await tx.wait();
  console.log("Moved to", to, "· transaction", tx.hash);
  console.log("Left in the pool:", hre.ethers.formatUnits(await ausd.balanceOf(POOL), 18), "AUSD (test)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
