import hre from "hardhat";

// Deploys WeepPay (one payment to many people, exact amounts, all or nothing), reusing the AUSD token
// that's already live. Live on Monad testnet at 0xa0209c2245FdD5928a7a602a2d4c7d4239CF5A26.
const AUSD_ADDRESS = "0xcEF38D455529Dbc2e37654452C288C25e18ADea4";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying from:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MON");
  const pay = await (await hre.ethers.getContractFactory("WeepPay")).deploy(AUSD_ADDRESS);
  await pay.waitForDeployment();
  console.log("-----------------------------------------");
  console.log(`NEXT_PUBLIC_WEEP_PAY=${await pay.getAddress()}`);
  console.log("-----------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
