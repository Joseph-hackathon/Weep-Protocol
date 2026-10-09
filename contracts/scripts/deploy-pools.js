import hre from "hardhat";

// Deploys WeepPools (every business gets its own tip pool), reusing the AUSD token that's already live.
const AUSD_ADDRESS = "0xcEF38D455529Dbc2e37654452C288C25e18ADea4";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying from:", deployer.address);
  const pools = await (await hre.ethers.getContractFactory("WeepPools")).deploy(AUSD_ADDRESS);
  await pools.waitForDeployment();
  console.log("-----------------------------------------");
  console.log(`NEXT_PUBLIC_WEEP_POOLS=${await pools.getAddress()}`);
  console.log(`TipPool template: ${await pools.implementation()}`);
  console.log("-----------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
