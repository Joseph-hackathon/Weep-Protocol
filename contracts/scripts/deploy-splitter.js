import hre from "hardhat";

// Deploys only a new TipSplitter, reusing the AUSD token that's already live,
// so everyone's existing test dollars keep working.
const AUSD_ADDRESS = "0xcEF38D455529Dbc2e37654452C288C25e18ADea4";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying from:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MON");

  const TipSplitter = await hre.ethers.getContractFactory("TipSplitter");
  const splitter = await TipSplitter.deploy(AUSD_ADDRESS, deployer.address);
  await splitter.waitForDeployment();
  const address = await splitter.getAddress();

  // Start on the same split the app shows today.
  await (await splitter.updatePolicy(60, 30, 10)).wait();

  console.log("-----------------------------------------");
  console.log(`NEXT_PUBLIC_TIP_SPLITTER=${address}`);
  console.log("-----------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
