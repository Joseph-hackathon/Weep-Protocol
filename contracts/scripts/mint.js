import hre from "hardhat";

async function main() {
  const AUSD_ADDRESS = "0xcEF38D455529Dbc2e37654452C288C25e18ADea4";
  const TARGET_WALLET = "0xF11D356a2E963d40D6B7bf1264b1c36e2ad0db4f";
  const MINT_AMOUNT = hre.ethers.parseUnits("10000", 18); // 10,000 AUSD

  console.log(`Minting ${hre.ethers.formatUnits(MINT_AMOUNT, 18)} AUSD to ${TARGET_WALLET}...`);

  const MockAUSD = await hre.ethers.getContractAt("MockAUSD", AUSD_ADDRESS);
  const tx = await MockAUSD.mint(TARGET_WALLET, MINT_AMOUNT);
  
  console.log("Transaction Hash:", tx.hash);
  await tx.wait();
  
  console.log("Minting successful!");
  
  const newBalance = await MockAUSD.balanceOf(TARGET_WALLET);
  console.log(`New Balance: ${hre.ethers.formatUnits(newBalance, 18)} AUSD`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
