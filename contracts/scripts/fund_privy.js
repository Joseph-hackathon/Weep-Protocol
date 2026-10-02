import hre from "hardhat";

async function main() {
  const AUSD_ADDRESS = "0xcEF38D455529Dbc2e37654452C288C25e18ADea4";
  const TARGET_WALLET = "0xe9073484c6c0278F167f1F63F714f5fbEc7bfAb2"; // The Privy embedded wallet
  
  const [deployer] = await hre.ethers.getSigners();

  // 1. Send Monad Gas
  console.log(`Sending 0.1 MONAD for gas to ${TARGET_WALLET}...`);
  const txGas = await deployer.sendTransaction({
    to: TARGET_WALLET,
    value: hre.ethers.parseEther("0.1")
  });
  await txGas.wait();
  console.log("Gas sent!");

  // 2. Mint AUSD
  console.log(`Minting 10000 AUSD to ${TARGET_WALLET}...`);
  const MockAUSD = await hre.ethers.getContractAt("MockAUSD", AUSD_ADDRESS);
  const txMint = await MockAUSD.mint(TARGET_WALLET, hre.ethers.parseUnits("10000", 18));
  await txMint.wait();
  
  console.log("Minting successful!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
