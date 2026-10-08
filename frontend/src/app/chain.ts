import { TIP_SPLITTER } from "./setup-message";

/**
 * Read-only access to Weep on Monad testnet with plain JSON-RPC (no wallet library, ~1 KB), plus the
 * call data for the transactions the customer can make. Addresses: README "Contracts".
 */
export const RPC = process.env.NEXT_PUBLIC_MONAD_RPC || "https://testnet-rpc.monad.xyz";
export const EXPLORER = "https://testnet.monadexplorer.com";
export const FAUCET = "https://faucet.monad.xyz";
/** TipSplitter (the team's tip pool); a redeployed pool is set with NEXT_PUBLIC_TIP_SPLITTER. */
export const SPLITTER = TIP_SPLITTER;
/** Agora USD (test), 18 decimals; set NEXT_PUBLIC_AUSD if a new pool uses a new token. */
export const AUSD = (process.env.NEXT_PUBLIC_AUSD || "0xcEF38D455529Dbc2e37654452C288C25e18ADea4") as `0x${string}`;

const SEL = {
  currentPolicy: "0xc7d29856", balanceOf: "0x70a08231", transfer: "0xa9059cbb", mint: "0x40c10f19",
  owner: "0x8da5cb5b", agent: "0xf5ff5c76", getTeam: "0x8bce6edd", approve: "0x095ea7b3", allowance: "0xdd62ed3e",
  tipIndividual: "0xefb301a4",
};
const word = (hex: string) => hex.replace(/^0x/, "").padStart(64, "0");

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result as T;
}
const call = (to: string, data: string) => rpc<string>("eth_call", [{ to, data }, "latest"]);

/** The live split rule (percentages): front of house, back of house (kitchen), bar. */
export async function readPolicy() {
  const r = (await call(SPLITTER, SEL.currentPolicy)).slice(2);
  const n = (i: number) => Number(BigInt("0x" + r.slice(i * 64, i * 64 + 64)));
  return { foh: n(0), boh: n(1), bar: n(2) };
}
export async function ausdBalance(owner: string) {
  return BigInt(await call(AUSD, SEL.balanceOf + word(owner)));
}
export async function monBalance(owner: string) {
  return BigInt(await rpc<string>("eth_getBalance", [owner, "latest"]));
}

/** Who runs the pool: only the owner or the agent may change the rule or register the team. */
export async function readRoles() {
  const [o, a] = await Promise.all([call(SPLITTER, SEL.owner), call(SPLITTER, SEL.agent)]);
  const addr = (r: string) => ("0x" + r.slice(-40)).toLowerCase();
  return { owner: addr(o), agent: addr(a) };
}
/** Whether the deployed pool keeps the team on-chain (getTeam / setTeam / tipIndividual / payoutTeam). */
export async function supportsTeam() {
  const code = await rpc<string>("eth_getCode", [SPLITTER, "latest"]);
  return code.toLowerCase().includes(SEL.getTeam.slice(2));
}

export type Member = { name: string; wallet: string; group: 0 | 1 | 2 }; // 0 floor, 1 kitchen, 2 bar
/** The saved team, read in one call (the public RPC caps log queries at 100 blocks, so no event scans). */
export async function readTeam(): Promise<Member[]> {
  const r = (await call(SPLITTER, SEL.getTeam)).slice(2);
  const at = (byte: number) => Number(BigInt("0x" + r.slice(byte * 2, byte * 2 + 64)));
  const list = at(0);               // offset of the array
  const n = at(list);
  const heads = list + 32;          // each element is a dynamic tuple: its offset is relative to here
  return Array.from({ length: n }, (_, i) => {
    const t = heads + at(heads + i * 32);
    const s = t + at(t);
    const len = at(s);
    const hex = r.slice((s + 32) * 2, (s + 32 + len) * 2);
    const bytes = new Uint8Array(hex.match(/../g)?.map((h) => parseInt(h, 16)) ?? []);
    return { name: new TextDecoder().decode(bytes), wallet: "0x" + r.slice((t + 32) * 2 + 24, (t + 64) * 2), group: at(t + 64) as 0 | 1 | 2 };
  });
}
export async function ausdAllowance(owner: string, spender: string) {
  return BigInt(await call(AUSD, SEL.allowance + word(owner) + word(spender)));
}

/** Dollars (2 decimals) ⇄ AUSD base units (18 decimals). */
const CENT = BigInt(10) ** BigInt(16);       // one cent in AUSD base units
const BASIS = BigInt(10) ** BigInt(14);      // 1/10,000 of a dollar
export const toUnits = (dollars: number) => BigInt(Math.round(dollars * 100)) * CENT;
export const toDollars = (units: bigint) => Number(units / BASIS) / 10000;

export const transferData = (to: string, units: bigint) => (SEL.transfer + word(to) + word(units.toString(16))) as `0x${string}`;
export const approveData = (spender: string, units: bigint) => (SEL.approve + word(spender) + word(units.toString(16))) as `0x${string}`;
/** tipIndividual(string name, uint256 amount): the tip goes straight from the customer to that person. */
export function tipIndividualData(name: string, units: bigint) {
  const bytes = Array.from(new TextEncoder().encode(name), (b) => b.toString(16).padStart(2, "0")).join("");
  const padded = bytes.padEnd(Math.ceil(bytes.length / 64) * 64, "0");
  return (SEL.tipIndividual + word("40") + word(units.toString(16)) + word((bytes.length / 2).toString(16)) + padded) as `0x${string}`;
}
export const mintData = (to: string, units: bigint) => (SEL.mint + word(to) + word(units.toString(16))) as `0x${string}`;

/** Wait until a transaction is included; resolves true on success, false on revert. */
export async function waitForReceipt(hash: string, timeoutMs = 90000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const r = await rpc<{ status: string } | null>("eth_getTransactionReceipt", [hash]).catch(() => null);
    if (r) return r.status === "0x1";
    await new Promise((res) => setTimeout(res, 600));
  }
  throw new Error("Still waiting for the network. Check the explorer in a moment.");
}

/** One transfer of test dollars, as recorded on Monad. */
export type Moved = { from: string; to: string; units: bigint; hash: string; block: number };
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
type Log = { address: string; topics: string[]; data: string; transactionHash: string; blockNumber: string };
const moved = (l: Log): Moved => ({ from: "0x" + l.topics[1].slice(-40), to: "0x" + l.topics[2].slice(-40), units: BigInt(l.data), hash: l.transactionHash, block: Number(BigInt(l.blockNumber)) });

/** What a confirmed transaction actually moved out of `from`: every test-dollar transfer in its receipt. */
export async function transfersIn(hash: string, from: string): Promise<Moved[]> {
  const r = await rpc<{ logs: Log[] } | null>("eth_getTransactionReceipt", [hash]);
  const sender = "0x" + word(from.toLowerCase());
  return (r?.logs ?? [])
    .filter((l) => l.address.toLowerCase() === AUSD.toLowerCase() && l.topics[0] === TRANSFER && l.topics[1]?.toLowerCase() === sender)
    .map(moved);
}

/**
 * Test dollars that reached `to` in the last ~100 blocks (the public RPC's search limit, under a minute on
 * Monad), newest first: amount, sender and transaction for each. Polled while a page is open.
 */
export async function receivedRecently(to: string): Promise<(Moved & { at: number })[]> {
  const head = Number(BigInt(await rpc<string>("eth_blockNumber", [])));
  const logs = await rpc<Log[]>("eth_getLogs", [{
    address: AUSD, fromBlock: "0x" + Math.max(0, head - 99).toString(16), toBlock: "0x" + head.toString(16),
    topics: [TRANSFER, null, "0x" + word(to.toLowerCase())],
  }]);
  // When each one happened, as recorded on Monad (one lookup per block, not per payment).
  const blocks = [...new Set(logs.map((l) => l.blockNumber))];
  const times = new Map(await Promise.all(blocks.map(async (b) => {
    const blk = await rpc<{ timestamp: string } | null>("eth_getBlockByNumber", [b, false]).catch(() => null);
    return [b, blk ? Number(BigInt(blk.timestamp)) * 1000 : Date.now()] as const;
  })));
  return logs.map((l) => ({ ...moved(l), at: times.get(l.blockNumber) ?? Date.now() })).reverse();
}
