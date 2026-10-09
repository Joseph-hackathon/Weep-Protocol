import hre from "hardhat";

/**
 * Deploys Weep's two contracts on Monad testnet, reusing the AUSD test token that's already live:
 *   WeepPay   — one payment to many people; Weep's fee 0.3% (30 bps), paid on top by the sender
 *   WeepPools — a tip pool for every business (with a fresh TipPool template); fee 0.5% (50 bps) on tips
 * The fee rate and recipient are fixed in each contract at deployment and can't be changed afterwards.
 *
 *   FEE_RECIPIENT=0x… npx hardhat run scripts/deploy-all.js --network monadTestnet
 *
 * Needs PRIVATE_KEY (the deployer, with a little MON) in contracts/.env and FEE_RECIPIENT in the environment.
 */
const AUSD = "0xcEF38D455529Dbc2e37654452C288C25e18ADea4";
const PAY_FEE_BPS = 30;
const TIP_FEE_BPS = 50;

async function main() {
  const feeRecipient = process.env.FEE_RECIPIENT;
  if (!feeRecipient || !hre.ethers.isAddress(feeRecipient)) throw new Error("Set FEE_RECIPIENT to the address that should receive Weep's fees.");
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying from:", deployer.address, "·", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MON");
  console.log("Fee recipient: ", feeRecipient);

  const pay = await (await hre.ethers.getContractFactory("WeepPay")).deploy(AUSD, PAY_FEE_BPS, feeRecipient);
  await pay.waitForDeployment();
  const pools = await (await hre.ethers.getContractFactory("WeepPools")).deploy(AUSD, TIP_FEE_BPS, feeRecipient);
  await pools.waitForDeployment();
  const [payAt, poolsAt, template] = [await pay.getAddress(), await pools.getAddress(), await pools.implementation()];

  console.log("\nSet these in Vercel (Production), then redeploy:\n");
  console.log(`NEXT_PUBLIC_WEEP_PAY=${payAt}`);
  console.log(`NEXT_PUBLIC_WEEP_POOLS=${poolsAt}`);
  console.log("\nVerify the source on MonadVision (Sourcify, no API key):\n");
  console.log(`npx hardhat verify --network monadTestnet ${payAt} ${AUSD} ${PAY_FEE_BPS} ${feeRecipient}`);
  console.log(`npx hardhat verify --network monadTestnet ${poolsAt} ${AUSD} ${TIP_FEE_BPS} ${feeRecipient}`);
  console.log(`npx hardhat verify --network monadTestnet ${template}`);
  console.log("\nTipPool template:", template);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
