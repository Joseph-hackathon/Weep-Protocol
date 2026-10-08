import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { verifyMessage } from "viem";
import { sendMessage } from "../../../send-message";

/**
 * Send: the wallet behind each email someone is paying. Privy returns the person's existing wallet, or makes
 * one (non-custodial) that they open by signing in with that email. Any sender may ask, but only with a fresh
 * message they signed themselves naming these exact emails, so a request can't be forged, replayed or altered.
 * (The business setup keeps its own route, limited to the pool's owner.)
 */
const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmujnrzih03xh0dl9k6itwgws";
const MAX_PEOPLE = 100;
const MAX_AGE_MS = 10 * 60 * 1000;
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function POST(req: Request) {
  const secret = process.env.PRIVY_APP_SECRET;
  if (!secret) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { emails?: string[]; issuedAt?: string; signer?: `0x${string}`; signature?: `0x${string}` };
  const emails = [...new Set((body.emails ?? []).map((e) => String(e).trim().toLowerCase()))];
  if (!emails.length || emails.length > MAX_PEOPLE || !emails.every(isEmail)) return NextResponse.json({ error: "bad-emails" }, { status: 400 });
  if (!body.signer || !body.signature || !body.issuedAt) return NextResponse.json({ error: "unsigned" }, { status: 401 });
  const age = Date.now() - Date.parse(body.issuedAt);
  if (!(age >= -60_000 && age <= MAX_AGE_MS)) return NextResponse.json({ error: "expired" }, { status: 401 });
  const valid = await verifyMessage({ address: body.signer, message: sendMessage(emails, body.issuedAt), signature: body.signature }).catch(() => false);
  if (!valid) return NextResponse.json({ error: "bad-signature" }, { status: 401 });

  const privy = new PrivyClient(APP_ID, secret);
  const out: { email: string; wallet: string | null }[] = [];
  for (const email of emails) {
    try {
      let user = await privy.getUserByEmail(email);
      if (!user) user = await privy.importUser({ linkedAccounts: [{ type: "email", address: email }], createEthereumWallet: true });
      else if (!user.wallet?.address) user = await privy.createWallets({ userId: user.id, createEthereumWallet: true });
      out.push({ email, wallet: user.wallet?.address ?? null });
    } catch (e) {
      console.error("send/wallets", email, e);
      out.push({ email, wallet: null });
    }
  }
  return NextResponse.json({ wallets: out });
}
