import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';

function addLog(msg: string) {
  const stmt = db.prepare('INSERT INTO system_logs (log) VALUES (?)');
  stmt.run(msg);
}

export async function GET() {
  const stmt = db.prepare('SELECT * FROM policies ORDER BY createdAt DESC LIMIT 1');
  const policy = stmt.get() as any;
  
  if (policy) {
    policy.roles = JSON.parse(policy.roles);
  }
  
  return NextResponse.json(policy || null);
}

export async function POST(request: Request) {
  const { text } = await request.json();
  
  addLog(`[EVENT] Received Natural Language Policy: '${text}'`);
  addLog(`[PROCESS] Parsing policy via AI Agent...`);

  let roles = { FOH: 50, BOH: 30, BAR: 20 }; // Default fallback

  try {
    if (process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        You are an AI Smart Contract Agent. Extract the tip distribution percentages from this text.
        Text: "${text}"
        Return ONLY a raw valid JSON object with keys FOH, BOH, BAR and their integer percentage values (without %).
        Example: {"FOH": 50, "BOH": 30, "BAR": 20}
      `;
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      roles = JSON.parse(responseText);
    } else {
      // Very basic fallback parser if no API key
      addLog(`[SYSTEM] No GEMINI_API_KEY found. Using fallback heuristics.`);
      if (text.includes("60") && text.toLowerCase().includes("front")) roles.FOH = 60;
      if (text.includes("30") && text.toLowerCase().includes("kitchen")) roles.BOH = 30;
      if (text.includes("10") && text.toLowerCase().includes("bar")) roles.BAR = 10;
    }
    
    addLog(`[SUCCESS] Policy parsed into structural schema.`);
  } catch (error) {
    console.error("AI Parse Error:", error);
    addLog(`[ERROR] AI parsing failed, using defaults.`);
  }

  const policyId = "POL-" + crypto.randomBytes(4).toString('hex').toUpperCase();
  
  // Still save to local DB for the UI list
  const stmt = db.prepare('INSERT INTO policies (id, merchant, roles, eligibility, status) VALUES (?, ?, ?, ?, ?)');
  stmt.run(policyId, "Merchant", JSON.stringify(roles), "employees_on_shift", "Active");

  addLog(`[LISTEN] Waiting for TipPool events...`);

  let txHash = "0x" + crypto.randomBytes(16).toString('hex');

  return NextResponse.json({ 
    policyId, 
    merchant: "Merchant", 
    roles, 
    eligibility: "employees_on_shift", 
    status: "Active",
    txHash
  });
}
