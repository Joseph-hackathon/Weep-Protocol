import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createPublicClient, createWalletClient, http, isAddress, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "viem/chains";

/**
 * Covers the network fee for people who signed in with email, so a first payment needs nothing but an email.
 * Weep's sponsor wallet sends 0.1 test MON to the person's own Privy wallet when it holds less than 0.05.
 * Only the signed-in person's own email wallet qualifies (checked with their Privy session), only while it is
 * new (fewer than 20 transactions), and never below the sponsor's reserve. Without GAS_SPONSOR_KEY it stays
 * off and the app points to Monad's faucet instead.
 */
const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmujnrzih03xh0dl9k6itwgws";
const TOP_UP = parseEther("0.1");
const ENOUGH = parseEther("0.05");
const RESERVE = parseEther("1");
const MAX_NONCE = 20;

const rpc = http(process.env.NEXT_PUBLIC_MONAD_RPC || undefined);
const chain = createPublicClient({ chain: monadTestnet, transport: rpc });

export async function POST(req: Request) {
  const secret = process.env.PRIVY_APP_SECRET;
  const key = process.env.GAS_SPONSOR_KEY;
  if (!secret || !key) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { address } = (await req.json().catch(() => ({}))) as { address?: string };
  if (!token) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  if (!address || !isAddress(address)) return NextResponse.json({ error: "bad-address" }, { status: 400 });

  // The person's own email wallet, and nothing else
  const privy = new PrivyClient(APP_ID, secret);
  let userId: string;
  try { ({ userId } = await privy.verifyAuthToken(token)); } catch { return NextResponse.json({ error: "signed-out" }, { status: 401 }); }
  const user = await privy.getUserById(userId);
  const own = user.linkedAccounts
    .filter((a) => a.type === "wallet" && (a as { walletClientType?: string }).walletClientType === "privy")
    .map((a) => (a as { address: string }).address.toLowerCase());
  if (!own.includes(address.toLowerCase())) return NextResponse.json({ error: "not-your-wallet" }, { status: 403 });

  const [balance, nonce] = await Promise.all([
    chain.getBalance({ address: address as `0x${string}` }),
    chain.getTransactionCount({ address: address as `0x${string}` }),
  ]);
  if (balance >= ENOUGH) return NextResponse.json({ covered: false, reason: "enough" });
  if (nonce >= MAX_NONCE) return NextResponse.json({ error: "limit" }, { status: 429 });

  const sponsor = privateKeyToAccount((key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`);
  if ((await chain.getBalance({ address: sponsor.address })) < RESERVE + TOP_UP) return NextResponse.json({ error: "empty" }, { status: 503 });
  try {
    const wallet = createWalletClient({ account: sponsor, chain: monadTestnet, transport: rpc });
    const hash = await wallet.sendTransaction({ to: address as `0x${string}`, value: TOP_UP });
    return NextResponse.json({ covered: true, hash });
  } catch (e) {
    console.error("gas", e);
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
