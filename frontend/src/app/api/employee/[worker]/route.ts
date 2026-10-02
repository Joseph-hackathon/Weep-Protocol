import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { queryContracts } from '@/lib/canton';

export async function GET(request: Request, { params }: { params: { worker: string } }) {
  const worker = params.worker;

  // 1. Fetch REAL on-chain Entitlements directly from Canton for verifiable privacy
  let onChainEntitlements: any[] = [];
  try {
    onChainEntitlements = await queryContracts(worker, "WorkerEntitlement");
  } catch (error) {
    console.error(`Failed to query Canton for ${worker}:`, error);
  }

  // Calculate real on-chain balance
  let totalBalance = 0;
  const txs = onChainEntitlements.map(ent => {
    totalBalance += parseFloat(ent.payload.amount);
    return {
      id: ent.contractId,
      txHash: ent.contractId.split(':')[0],
      date: new Date().toLocaleString(), // Canton sandbox doesn't return time easily without events, using current for demo
      type: "Tip Pool Payout (On-Chain)",
      amount: parseFloat(ent.payload.amount),
      verified: true
    };
  });

  // 2. Fetch withdrawal history from local DB to subtract from total
  const stmt = db.prepare("SELECT * FROM entitlements WHERE worker = ? AND role = 'Withdrawal' ORDER BY createdAt DESC");
  const withdrawals = stmt.all(worker) as any[];

  withdrawals.forEach(w => {
    totalBalance += w.amount; // w.amount is negative
    txs.push({
      id: w.id,
      txHash: w.tipPoolId,
      date: new Date(w.createdAt).toLocaleString(),
      type: "Fiat Withdrawal",
      amount: w.amount,
      verified: true
    });
  });

  return NextResponse.json({
    name: worker,
    role: onChainEntitlements.length > 0 ? onChainEntitlements[0].payload.role : "Employee",
    balance: totalBalance,
    transactions: txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  });
}
