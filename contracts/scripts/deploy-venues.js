import hre from "hardhat";

// Deploys WeepVenues (any business opens its own venue; tips go straight to the team's wallets),
// reusing the AUSD token that's already live, so everyone's existing test dollars keep working.
const AUSD_ADDRESS = "0xcEF38D455529Dbc2e37654452C288C25e18ADea4";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying from:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MON");

  const Venues = await hre.ethers.getContractFactory("WeepVenues");
  const venues = await Venues.deploy(AUSD_ADDRESS);
  await venues.waitForDeployment();

  console.log("-----------------------------------------");
  console.log(`NEXT_PUBLIC_WEEP=${await venues.getAddress()}`);
  console.log("-----------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
