import hre from "hardhat";

async function main() {
  console.log("Starting deployment on Monad Testnet...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "MONAD");

  // 1. Deploy Mock AUSD
  console.log("Deploying Mock AUSD...");
  const MockAUSD = await hre.ethers.getContractFactory("MockAUSD");
  const ausd = await MockAUSD.deploy();
  await ausd.waitForDeployment();
  const ausdAddress = await ausd.getAddress();
  console.log("Mock AUSD deployed to:", ausdAddress);

  // 2. Deploy TipSplitter
  console.log("Deploying TipSplitter...");
  // Use deployer address as the agent for now
  const TipSplitter = await hre.ethers.getContractFactory("TipSplitter");
  const tipSplitter = await TipSplitter.deploy(ausdAddress, deployer.address);
  await tipSplitter.waitForDeployment();
  const tipSplitterAddress = await tipSplitter.getAddress();
  console.log("TipSplitter deployed to:", tipSplitterAddress);

  console.log("-----------------------------------------");
  console.log("Deployment Complete!");
  console.log(`AUSD_ADDRESS="${ausdAddress}"`);
  console.log(`TIP_SPLITTER_ADDRESS="${tipSplitterAddress}"`);
  console.log("-----------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
