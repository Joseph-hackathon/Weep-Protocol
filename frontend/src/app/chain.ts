import { TIP_SPLITTER } from "./setup-message";

/**
 * Read-only access to Weep on Monad testnet with plain JSON-RPC (no wallet library, ~1 KB), plus the
 * call data for the two transactions the customer can make. Addresses: README "Contract Details".
 */
export const RPC = "https://testnet-rpc.monad.xyz";
export const EXPLORER = "https://testnet.monadexplorer.com";
export const FAUCET = "https://faucet.monad.xyz";
/** TipSplitter (the team's tip pool); a redeployed pool is set with NEXT_PUBLIC_TIP_SPLITTER. */
export const SPLITTER = TIP_SPLITTER;
/** Agora USD (test), 18 decimals; set NEXT_PUBLIC_AUSD if a new pool uses a new token. */
export const AUSD = (process.env.NEXT_PUBLIC_AUSD || "0xcEF38D455529Dbc2e37654452C288C25e18ADea4") as `0x${string}`;

const SEL = {
  currentPolicy: "0xc7d29856", balanceOf: "0x70a08231", transfer: "0xa9059cbb", mint: "0x40c10f19",
  owner: "0x8da5cb5b", agent: "0xf5ff5c76", registerEmployee: "0xf0b3410a",
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
/** Whether the deployed pool has the team registry (registerEmployee / tipIndividual). */
export async function supportsTeam() {
  const code = await rpc<string>("eth_getCode", [SPLITTER, "latest"]);
  return code.toLowerCase().includes(SEL.registerEmployee.slice(2));
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
