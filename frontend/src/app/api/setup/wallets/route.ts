import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createPublicClient, http, parseAbi, verifyMessage } from "viem";
import { monadTestnet } from "viem/chains";
import { SHARED_POOL, WEEP_POOLS, setupMessage } from "../../../setup-message";

/**
 * One-prompt team setup, step 2: make sure every employee has a wallet before they ever sign in.
 * For each email, Privy returns the existing embedded wallet or pre-generates one (non-custodial; the
 * employee unlocks it later by signing in with that email).
 *
 * Only the business's own wallet may do this, for its own pool: the request carries a message signed by the
 * pool's owner or agent, or, before the pool exists, by the wallet whose pool will be created at that address.
 */
const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmujnrzih03xh0dl9k6itwgws";
const MAX_PEOPLE = 50;
const MAX_AGE_MS = 10 * 60 * 1000;

const client = createPublicClient({ chain: monadTestnet, transport: http(process.env.NEXT_PUBLIC_MONAD_RPC || undefined) });
const roles = parseAbi(["function owner() view returns (address)", "function agent() view returns (address)"]);
const factory = parseAbi(["function isPool(address) view returns (bool)", "function predict(address) view returns (address)"]);
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function POST(req: Request) {
  const secret = process.env.PRIVY_APP_SECRET;
  if (!secret) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { emails?: string[]; issuedAt?: string; signer?: `0x${string}`; signature?: `0x${string}`; pool?: `0x${string}` };
  const emails = [...new Set((body.emails ?? []).map((e) => String(e).trim().toLowerCase()))];
  if (!emails.length || emails.length > MAX_PEOPLE || !emails.every(isEmail)) return NextResponse.json({ error: "bad-emails" }, { status: 400 });
  if (!body.signer || !body.signature || !body.issuedAt || !body.pool || !/^0x[0-9a-fA-F]{40}$/.test(body.pool)) return NextResponse.json({ error: "unsigned" }, { status: 401 });
  const age = Date.now() - Date.parse(body.issuedAt);
  if (!(age >= -60_000 && age <= MAX_AGE_MS)) return NextResponse.json({ error: "expired" }, { status: 401 });

  // The signature must match, and the signer must run this pool (or be about to create it).
  const valid = await verifyMessage({ address: body.signer, message: setupMessage(emails, body.issuedAt, body.pool), signature: body.signature }).catch(() => false);
  if (!valid) return NextResponse.json({ error: "bad-signature" }, { status: 401 });
  if (!(await runsPool(body.signer, body.pool))) return NextResponse.json({ error: "not-owner" }, { status: 403 });

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

/** True when `signer` owns or is the agent of `pool` (a Weep pool), or `pool` is the address of the signer's own pool yet to be created. */
async function runsPool(signer: `0x${string}`, pool: `0x${string}`) {
  const me = signer.toLowerCase();
  const target = pool.toLowerCase();
  const [created, predicted] = await Promise.all([
    client.readContract({ address: WEEP_POOLS, abi: factory, functionName: "isPool", args: [pool] }),
    client.readContract({ address: WEEP_POOLS, abi: factory, functionName: "predict", args: [signer] }),
  ]);
  if (!created && target !== SHARED_POOL.toLowerCase()) return predicted.toLowerCase() === target;
  const [owner, agent] = await Promise.all([
    client.readContract({ address: pool, abi: roles, functionName: "owner" }),
    client.readContract({ address: pool, abi: roles, functionName: "agent" }),
  ]);
  return me === owner.toLowerCase() || me === agent.toLowerCase();
}
