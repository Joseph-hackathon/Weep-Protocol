import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { address } = await req.json();

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const NANSEN_API_KEY = process.env.NANSEN_API_KEY;

    if (!NANSEN_API_KEY) {
      return NextResponse.json({
        labels: ["Demo: Missing API Key"],
        score: Math.floor(Math.random() * 100) + 1,
        message: "Please add NANSEN_API_KEY to .env.local for real data"
      });
    }

    // Call two 1-credit endpoints instead of the 100-credit labels endpoint
    const [balanceRes, relatedRes] = await Promise.all([
      fetch('https://api.nansen.ai/api/v1/profiler/address/current-balance', {
        method: 'POST',
        headers: { 'accept': 'application/json', 'Content-Type': 'application/json', 'apikey': NANSEN_API_KEY },
        body: JSON.stringify({ address, chain: 'ethereum' })
      }),
      fetch('https://api.nansen.ai/api/v1/profiler/address/related-wallets', {
        method: 'POST',
        headers: { 'accept': 'application/json', 'Content-Type': 'application/json', 'apikey': NANSEN_API_KEY },
        body: JSON.stringify({ address, chain: 'ethereum' })
      })
    ]);

    if (!balanceRes.ok || !relatedRes.ok) {
      const errText = await balanceRes.text();
      throw new Error(`Nansen API failed: ${balanceRes.status} ${errText}`);
    }

    const balanceData = await balanceRes.json();
    const relatedData = await relatedRes.json();

    const tokenCount = balanceData.data?.length || 0;
    const relatedWallets = (relatedData.data || []).map((rw: any) => rw.address_label || rw.relation).filter(Boolean);

    // Extract basic labels based on behavior instead of paying 100 credits for them
    let labels = [];
    if (tokenCount > 5) labels.push("Active Trader");
    else if (tokenCount > 0) labels.push("Holds Assets");
    else labels.push("Empty Wallet");

    let score = 10;
    if (tokenCount === 0) {
      score = 85; // Empty wallets might be burner/bot wallets
      labels.push("High Risk (Burner)");
    } else if (relatedWallets.some((w: string) => w.toLowerCase().includes("scam") || w.toLowerCase().includes("phish"))) {
      score = 99;
      labels.push("Related to Scams");
    }

    // Add unique related wallet roles to labels
    labels = [...new Set([...labels, ...relatedWallets.slice(0, 3)])];

    return NextResponse.json({
      labels: labels,
      score: score,
      message: "Fetched live from Nansen Profiler"
    });
  } catch (error: any) {
    console.error('Nansen route error:', error);
    return NextResponse.json({
      labels: ["API Limit / 403 Error"],
      score: 50,
      message: "Fallback triggered."
    });
  }
}
