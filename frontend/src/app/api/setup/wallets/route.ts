import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { verifyMessage } from "viem";
import { setupMessage } from "../../../setup-message";

/**
 * One-prompt team setup, step 2: make sure every employee has a wallet before they ever sign in.
 * For each email, Privy returns the existing embedded wallet or pre-generates one (non-custodial; the
 * employee unlocks it later by signing in with that email).
 *
 * Any business can open a venue, so any wallet may ask, but only with a fresh message it signed itself
 * that names these exact emails: a request can't be forged, replayed later, or changed in transit.
 */
const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmujnrzih03xh0dl9k6itwgws";
const MAX_PEOPLE = 50;
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

  const valid = await verifyMessage({ address: body.signer, message: setupMessage(emails, body.issuedAt), signature: body.signature }).catch(() => false);
  if (!valid) return NextResponse.json({ error: "bad-signature" }, { status: 401 });

  const privy = new PrivyClient(APP_ID, secret);
  const out: { email: string; wallet: string | null; created: boolean }[] = [];
  for (const email of emails) {
    try {
      let user = await privy.getUserByEmail(email);
      let created = false;
      if (!user) {
        user = await privy.importUser({ linkedAccounts: [{ type: "email", address: email }], createEthereumWallet: true });
        created = true;
      } else if (!user.wallet?.address) {
        user = await privy.createWallets({ userId: user.id, createEthereumWallet: true });
        created = true;
      }
      out.push({ email, wallet: user.wallet?.address ?? null, created });
    } catch (e) {
      console.error("setup/wallets", email, e);
      out.push({ email, wallet: null, created: false });
    }
  }
  return NextResponse.json({ wallets: out });
}
