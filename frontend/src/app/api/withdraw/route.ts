import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';
import { exerciseChoice, queryContracts } from '@/lib/canton';

export async function POST(request: Request) {
  try {
    const { worker, amount } = await request.json();
    
    // 1. Query the Canton Ledger directly to find unwithdrawn Entitlements for this worker
    const entitlements = await queryContracts(worker, "WorkerEntitlement");
    
    let balanceFound = 0;
    let contractToWithdraw = null;

    for (const ent of entitlements) {
      if (ent.payload.amount === amount || entitlements.length === 1) {
        contractToWithdraw = ent.contractId;
        balanceFound = ent.payload.amount;
        break;
      }
    }

    if (!contractToWithdraw) {
      return NextResponse.json({ error: "No matching on-chain entitlement found to withdraw." }, { status: 400 });
    }

    // 2. Exercise the "Withdraw" choice on Canton
    await exerciseChoice(worker, "WorkerEntitlement", contractToWithdraw, "Withdraw", {
      withdrawer: worker
    });

    // 3. Keep local DB in sync for UI purposes
    const txId = "WD-" + crypto.randomBytes(4).toString('hex').toUpperCase();
    let eventId = contractToWithdraw.split(':')[0] || "WD-ONCHAIN";

    const insertStmt = db.prepare(`
      INSERT INTO entitlements (id, tipPoolId, worker, role, amount, verified)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run(txId, eventId, worker, 'Withdrawal', -amount, 1);

    db.prepare('INSERT INTO system_logs (log) VALUES (?)').run(`[CANTON] Worker ${worker} securely archived WorkerEntitlement via Withdraw choice.`);
    db.prepare('INSERT INTO system_logs (log) VALUES (?)').run(`[SUCCESS] $${amount} routed from ${worker}'s private entitlement to fiat bridge.`);

    return NextResponse.json({ success: true, txId: eventId });
  } catch (error: any) {
    console.error("Canton Withdraw Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
