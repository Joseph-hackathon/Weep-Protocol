import hre from "hardhat";

/**
 * Deploys a new WeepPools (with a new TipPool template) on Monad testnet. WeepPay, the AUSD test token and Weep's
 * fee recipient stay the same. Pools made by an earlier WeepPools keep working; new businesses get a pool from
 * this one.
 *
 *   FEE_RECIPIENT=0x… npx hardhat run scripts/deploy-pools.js --network monadTestnet
 *
 * Needs PRIVATE_KEY (the deployer, with a little MON) in contracts/.env and FEE_RECIPIENT in the environment.
 */
const AUSD = "0xcEF38D455529Dbc2e37654452C288C25e18ADea4";
const TIP_FEE_BPS = 50;

async function main() {
  const feeRecipient = process.env.FEE_RECIPIENT;
  if (!feeRecipient || !hre.ethers.isAddress(feeRecipient)) throw new Error("Set FEE_RECIPIENT to the address that should receive Weep's fees.");
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying from:", deployer.address, "·", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MON");
  console.log("Fee recipient: ", feeRecipient);

  const pools = await (await hre.ethers.getContractFactory("WeepPools")).deploy(AUSD, TIP_FEE_BPS, feeRecipient);
  await pools.waitForDeployment();
  const [poolsAt, template] = [await pools.getAddress(), await pools.implementation()];

  console.log("\nSet this in Vercel (Production), then redeploy:\n");
  console.log(`NEXT_PUBLIC_WEEP_POOLS=${poolsAt}`);
  console.log("\nVerify the source on MonadVision:\n");
  console.log(`npx hardhat verify --network monadTestnet ${poolsAt} ${AUSD} ${TIP_FEE_BPS} ${feeRecipient}`);
  console.log(`npx hardhat verify --network monadTestnet ${template}`);
  console.log("\nTipPool template:", template);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
