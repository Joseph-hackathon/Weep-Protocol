/**
 * Read-only access to Weep on Monad testnet with plain JSON-RPC (no wallet library, ~1 KB), plus the
 * call data for the two transactions the customer can make. Addresses: README "Contract Details".
 */
export const RPC = "https://testnet-rpc.monad.xyz";
export const EXPLORER = "https://testnet.monadexplorer.com";
export const FAUCET = "https://faucet.monad.xyz";
export const SPLITTER = "0x1A245Dc83F286CA5A6833626E813776623f9F336" as const; // TipSplitter: the team's tip pool
export const AUSD = "0xcEF38D455529Dbc2e37654452C288C25e18ADea4" as const;     // Agora USD (test): 18 decimals

const SEL = { currentPolicy: "0xc7d29856", balanceOf: "0x70a08231", transfer: "0xa9059cbb", mint: "0x40c10f19" };
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

/** Dollars (2 decimals) ⇄ AUSD base units (18 decimals). */
const CENT = BigInt(10) ** BigInt(16);       // one cent in AUSD base units
const BASIS = BigInt(10) ** BigInt(14);      // 1/10,000 of a dollar
export const toUnits = (dollars: number) => BigInt(Math.round(dollars * 100)) * CENT;
export const toDollars = (units: bigint) => Number(units / BASIS) / 10000;

export const transferData = (to: string, units: bigint) => (SEL.transfer + word(to) + word(units.toString(16))) as `0x${string}`;
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
