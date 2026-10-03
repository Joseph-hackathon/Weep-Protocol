import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createPublicClient, http, parseAbi, verifyMessage } from "viem";
import { monadTestnet } from "viem/chains";
import { TIP_SPLITTER, setupMessage } from "../../../setup-message";

/**
 * One-prompt team setup, step 2: make sure every employee has a wallet before they ever sign in.
 * For each email, Privy returns the existing embedded wallet or pre-generates one (non-custodial; the
 * employee unlocks it later by signing in with that email).
 *
 * Only the venue's own wallet may do this: the request carries a message signed by the TipSplitter's
 * owner or agent, so nobody else can create accounts through this app.
 */
const SPLITTER = TIP_SPLITTER;
const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmujnrzih03xh0dl9k6itwgws";
const MAX_PEOPLE = 50;
const MAX_AGE_MS = 10 * 60 * 1000;

const client = createPublicClient({ chain: monadTestnet, transport: http(process.env.NEXT_PUBLIC_MONAD_RPC || undefined) });
const roles = parseAbi(["function owner() view returns (address)", "function agent() view returns (address)"]);
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

  // The signature must match, and the signer must run this pool.
  const valid = await verifyMessage({ address: body.signer, message: setupMessage(emails, body.issuedAt), signature: body.signature }).catch(() => false);
  if (!valid) return NextResponse.json({ error: "bad-signature" }, { status: 401 });
  const [owner, agent] = await Promise.all([
    client.readContract({ address: SPLITTER, abi: roles, functionName: "owner" }),
    client.readContract({ address: SPLITTER, abi: roles, functionName: "agent" }),
  ]);
  const signer = body.signer.toLowerCase();
  if (signer !== owner.toLowerCase() && signer !== agent.toLowerCase()) return NextResponse.json({ error: "not-owner" }, { status: 403 });

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
