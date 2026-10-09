import hre from "hardhat";

/**
 * Deploys WeepPolicyRegistry on Monad testnet: the contract that records the tip policy Weep's Chainlink CRE
 * workflow reads from a business's description. It holds no money and has no power over any pool.
 *
 * Only the Chainlink Forwarder given here can write to it. The default is Chainlink's MockKeystoneForwarder on
 * Monad testnet, which `cre workflow simulate --broadcast` uses. A workflow deployed to the Chainlink DON writes
 * through the KeystoneForwarder instead, so deploy a second registry with FORWARDER set to that.
 *
 *   npx hardhat run scripts/deploy-policy-registry.js --network monadTestnet
 *   $env:FORWARDER="0xF8344CFd5c43616a4366C34E3EEE75af79a74482"; npx hardhat run scripts/deploy-policy-registry.js --network monadTestnet
 *
 * Needs PRIVATE_KEY (the deployer, with a little MON) in contracts/.env.
 */
const MOCK_FORWARDER = "0xB9F79d863261869B234c481D1f9A7af84AeAd192"; // simulation, Monad testnet
const KEYSTONE_FORWARDER = "0xF8344CFd5c43616a4366C34E3EEE75af79a74482"; // deployed workflows, Monad testnet

async function main() {
  const forwarder = process.env.FORWARDER || MOCK_FORWARDER;
  if (!hre.ethers.isAddress(forwarder)) throw new Error("FORWARDER isn't an address.");
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying from:", deployer.address, "·", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MON");
  console.log("Forwarder:     ", forwarder, forwarder === MOCK_FORWARDER ? "(simulation)" : forwarder === KEYSTONE_FORWARDER ? "(deployed workflows)" : "");

  const registry = await (await hre.ethers.getContractFactory("WeepPolicyRegistry")).deploy(forwarder);
  await registry.waitForDeployment();
  const at = await registry.getAddress();

  console.log(`\nWeepPolicyRegistry: ${at}`);
  console.log(`\nPut it in cre/weep-policy/config.staging.json as "registry", and in Vercel as NEXT_PUBLIC_WEEP_POLICY_REGISTRY.`);
  console.log("\nVerify the source on MonadVision:\n");
  console.log(`npx hardhat verify --network monadTestnet ${at} ${forwarder}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
