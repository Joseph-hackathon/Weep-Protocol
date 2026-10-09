import fs from "node:fs";
import path from "node:path";
import hre from "hardhat";

/**
 * Sets up the sponsor wallet that covers the first network fee of people who sign in with email.
 *  - First run: creates a new wallet and saves its private key in contracts/.env as GAS_SPONSOR_KEY
 *    (git-ignored; the key is never printed), then sends it 5 test MON from the deployer.
 *  - Later runs: reuses GAS_SPONSOR_KEY from contracts/.env and only tops it up to 5 MON.
 * Prints the sponsor's public address and balance only.
 *
 *   npx hardhat run scripts/create-sponsor.js --network monadTestnet
 *
 * Then copy the GAS_SPONSOR_KEY value from contracts/.env into Vercel (Production and Preview).
 */
const TARGET = hre.ethers.parseEther("5");
const ENV = path.resolve(process.cwd(), ".env");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  let key = process.env.GAS_SPONSOR_KEY;
  if (!key) {
    key = hre.ethers.Wallet.createRandom().privateKey;
    fs.appendFileSync(ENV, `\nGAS_SPONSOR_KEY=${key}\n`);
    console.log("Created a new sponsor wallet; its key is saved in contracts/.env as GAS_SPONSOR_KEY (not shown).");
  } else {
    console.log("Using the sponsor wallet already in contracts/.env.");
  }
  const sponsor = new hre.ethers.Wallet(key).address;
  const has = await hre.ethers.provider.getBalance(sponsor);
  if (has < TARGET) {
    const tx = await deployer.sendTransaction({ to: sponsor, value: TARGET - has });
    await tx.wait();
    console.log("Funded from", deployer.address, "· transaction", tx.hash);
  }
  console.log("Sponsor address:", sponsor);
  console.log("Sponsor balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(sponsor)), "MON");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
