import { Workflow, Trigger, Output, Capability } from '@chainlink/cre-sdk';

/**
 * Weep Protocol: Automated Tip Distribution Workflow
 * Deployed to the Chainlink CRE (Cross-chain Runtime Environment)
 */
const weepWorkflow = new Workflow({
  name: 'weep-tip-distributor',
  description: 'AI-driven tip distribution workflow for Weep Protocol on Monad',
});

/**
 * 1. TRIGGER
 * Trigger this workflow every day at 23:00 (End of Shift) using Chainlink Automation cron.
 */
const dailyTrigger = new Trigger.Cron({
  schedule: '0 23 * * *', // Every day at 11:00 PM
});
weepWorkflow.addTrigger(dailyTrigger);

/**
 * 2. READ (Capability)
 * Connect to an off-chain API (e.g., Google Gemini) to calculate today's tip ratio 
 * based on the manager's natural language instructions.
 */
const fetchPolicy = new Capability.HTTP({
  method: 'GET',
  url: 'https://api.weep.protocol/today-policy', // Placeholder for actual backend AI parser
});
const policyResult = weepWorkflow.addCapability(fetchPolicy, {
  triggeredBy: dailyTrigger,
});

/**
 * 3. DECIDE & WRITE (Capability)
 * Call the distributeTips() function on the Monad Smart Contract.
 * Monad testnet chainId = 10143
 */
const executeDistribution = new Capability.EVM.Write({
  chain: 'monad-testnet',
  target: '0xYourTipSplitterContractAddress',
  abi: 'function distributeTips(address[] foh, address[] boh, address[] bar)',
  args: [
    policyResult.data.fohWorkers,
    policyResult.data.bohWorkers,
    policyResult.data.barWorkers
  ],
});
weepWorkflow.addCapability(executeDistribution, {
  triggeredBy: policyResult,
});

export default weepWorkflow;
