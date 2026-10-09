import hre from "hardhat";

/**
 * Retires Weep's very first pool (0x1A24…F336, an early TipSplitter without payoutTeam), which the app no
 * longer uses. Only its owner (0xF11D…db4f) can run this: put that wallet's key in contracts/.env as
 * PRIVATE_KEY. It sets the split to 100% front of house, then sends the whole balance to RETURN_TO in one
 * distributeTips call. With nothing in the pool it only reports.
 *
 *   RETURN_TO=0x… npx hardhat run scripts/retire-first-pool.js --network monadTestnet
 */
const POOL = "0x1A245Dc83F286CA5A6833626E813776623f9F336";
const AUSD = "0xcEF38D455529Dbc2e37654452C288C25e18ADea4";
const ABI = [
  "function owner() view returns (address)",
  "function updatePolicy(uint256 foh, uint256 boh, uint256 bar)",
  "function distributeTips(address[] foh, address[] boh, address[] bar)",
];

async function main() {
  const to = process.env.RETURN_TO;
  if (!to || !hre.ethers.isAddress(to)) throw new Error("Set RETURN_TO to the address that should receive the pool's remaining test dollars.");
  const [me] = await hre.ethers.getSigners();
  const pool = await hre.ethers.getContractAt(ABI, POOL);
  const ausd = await hre.ethers.getContractAt(["function balanceOf(address) view returns (uint256)"], AUSD);
  const owner = await pool.owner();
  if (owner.toLowerCase() !== me.address.toLowerCase()) throw new Error(`Run this from the pool's owner, ${owner}.`);
  const left = await ausd.balanceOf(POOL);
  console.log("First pool holds", hre.ethers.formatUnits(left, 18), "AUSD (test)");
  if (left === 0n) { console.log("Nothing to move. The pool is retired."); return; }
  await (await pool.updatePolicy(100, 0, 0)).wait();
  const tx = await pool.distributeTips([to], [], []);
  await tx.wait();
  console.log("Moved to", to, "· transaction", tx.hash);
  console.log("Left in the pool:", hre.ethers.formatUnits(await ausd.balanceOf(POOL), 18), "AUSD (test)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
