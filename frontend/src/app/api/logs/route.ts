import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  const stmt = db.prepare('SELECT * FROM system_logs ORDER BY id ASC');
  const logs = stmt.all() as any[];
  return NextResponse.json(logs.map(l => l.log));
}
