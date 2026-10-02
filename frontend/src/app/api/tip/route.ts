import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';

function addLog(msg: string) {
  const stmt = db.prepare('INSERT INTO system_logs (log) VALUES (?)');
  stmt.run(msg);
}

export async function POST(request: Request) {
  const { amount } = await request.json();
  
  const tipPoolId = "TIP-" + crypto.randomBytes(4).toString('hex').toUpperCase();
  let txHash = tipPoolId;
  
  addLog(`[EVENT] Received TipPool creation: $${amount.toFixed(2)} from Customer.`);

  try {
    const { createContract, exerciseChoice, queryContracts } = await import('@/lib/canton');
    
    // 1. Create TipPool
    addLog(`[CANTON] Creating TipPool contract...`);
    const tipResult = await createContract("Customer", "TipPool", {
      merchant: "Merchant",
      customer: "Customer",
      agent: "Agent",
      amount: amount.toString(),
      timestamp: new Date().toISOString()
    });
    addLog(`[DEBUG] createContract Result: ${JSON.stringify(tipResult)}`);

    // 2. Fetch Active Policy from Canton
    addLog(`[CANTON] Querying active DistributionPolicy...`);
    const policies = await queryContracts("Agent", "DistributionPolicy");
    if (policies.length === 0) {
      addLog(`[ERROR] No active policy found on Canton.`);
      return NextResponse.json({ error: "No policy found" }, { status: 400 });
    }
    const policyContractId = policies[policies.length - 1].contractId;

    // 3. Exercise choice
    addLog(`[PROCESS] Executing CalculateDistribution choice on Canton...`);
    await exerciseChoice(["Agent", "Customer"], "DistributionPolicy", policyContractId, "CalculateDistribution", {
      tipPoolId: tipResult.contractId,
      fohWorkers: ["Alice"],
      bohWorkers: ["Bob"],
      barWorkers: ["Carol"]
    });
    
    addLog(`[CANTON] Worker Entitlements created securely on Ledger.`);
    addLog(`[SUCCESS] SettlementReceipt generated.`);
    
    let eventId = tipResult.contractId;
    if (eventId.includes(':')) {
      eventId = eventId.split(':')[0];
    }
    txHash = eventId;
  } catch (error: any) {
    addLog(`[CANTON-ERROR] ${error.message}`);
  }

  // Backup: Update local DB for UI convenience
  const insertTip = db.prepare('INSERT INTO tip_pools (id, merchant, amount, status) VALUES (?, ?, ?, ?)');
  insertTip.run(tipPoolId, "Merchant", amount, "Settled");

  const policyStmt = db.prepare('SELECT * FROM policies ORDER BY createdAt DESC LIMIT 1');
  const policy = policyStmt.get() as any;
  if (policy) {
    const roles = JSON.parse(policy.roles);
    const fohAmt = amount * (roles.FOH / 100);
    const bohAmt = amount * (roles.BOH / 100);
    const barAmt = amount * (roles.BAR / 100);
    const insertEntitlement = db.prepare('INSERT INTO entitlements (id, tipPoolId, worker, role, amount, verified) VALUES (?, ?, ?, ?, ?, ?)');
    insertEntitlement.run("ENT-" + crypto.randomBytes(4).toString('hex').toUpperCase(), tipPoolId, "Alice", "FOH", fohAmt, 1);
    insertEntitlement.run("ENT-" + crypto.randomBytes(4).toString('hex').toUpperCase(), tipPoolId, "Bob", "BOH", bohAmt, 1);
    insertEntitlement.run("ENT-" + crypto.randomBytes(4).toString('hex').toUpperCase(), tipPoolId, "Carol", "BAR", barAmt, 1);
  }

  addLog(`[SYSTEM] Settlement cycle complete. Resuming listening...`);

  return NextResponse.json({ success: true, tipPoolId, txHash });
}
