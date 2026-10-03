import { decodeFunctionResult, encodeFunctionData, parseAbi, toEventSelector } from "viem";
import { WEEP } from "./setup-message";

/**
 * Weep on Monad testnet: reads with plain JSON-RPC, and the call data for every transaction the app sends.
 * Venues live in one contract (WeepVenues): any business opens its own, and tips go straight into the
 * team's wallets in the same transaction.
 */
export const RPC = process.env.NEXT_PUBLIC_MONAD_RPC || "https://testnet-rpc.monad.xyz";
export const EXPLORER = "https://testnet.monadexplorer.com";
export const FAUCET = "https://faucet.monad.xyz";
export { WEEP };
/** Agora USD (test), 18 decimals; set NEXT_PUBLIC_AUSD if the venues contract uses a new token. */
export const AUSD = (process.env.NEXT_PUBLIC_AUSD || "0xcEF38D455529Dbc2e37654452C288C25e18ADea4") as `0x${string}`;

const abi = parseAbi([
  "struct Member { string name; address wallet; uint8 group; }",
  "function venueCount() view returns (uint256)",
  "function getVenue(uint256 venueId) view returns (string name, address admin, uint8[3] split, uint256 tipped, Member[] team)",
  "function venuesOf(address admin) view returns (uint256[])",
  "function createVenue(string name, uint8[3] split, string[] names, address[] wallets, uint8[] groups) returns (uint256)",
  "function updateVenue(uint256 venueId, string name, uint8[3] split, string[] names, address[] wallets, uint8[] groups)",
  "function tipTeam(uint256 venueId, uint256 amount)",
  "function tipPerson(uint256 venueId, string name, uint256 amount)",
]);
const VENUE_CREATED = toEventSelector("VenueCreated(uint256,address,string)");
const SEL = { balanceOf: "0x70a08231", allowance: "0xdd62ed3e", approve: "0x095ea7b3", mint: "0x40c10f19" };
const word = (hex: string) => hex.replace(/^0x/, "").padStart(64, "0");

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result as T;
}
const call = (to: string, data: string) => rpc<`0x${string}`>("eth_call", [{ to, data }, "latest"]);

export type Group = 0 | 1 | 2; // 0 floor, 1 kitchen, 2 bar
export type Member = { name: string; wallet: string; group: Group };
export type Split = { foh: number; boh: number; bar: number };
export type Venue = { id: number; name: string; admin: string; split: Split; tipped: number; team: Member[] };

export async function venueCount() {
  return Number(decodeFunctionResult({ abi, functionName: "venueCount", data: await call(WEEP, encodeFunctionData({ abi, functionName: "venueCount" })) }));
}
export async function readVenue(id: number): Promise<Venue> {
  const data = await call(WEEP, encodeFunctionData({ abi, functionName: "getVenue", args: [BigInt(id)] }));
  const [name, admin, split, tipped, team] = decodeFunctionResult({ abi, functionName: "getVenue", data });
  return {
    id, name, admin: admin.toLowerCase(),
    split: { foh: split[0], boh: split[1], bar: split[2] },
    tipped: toDollars(tipped),
    team: team.map((m) => ({ name: m.name, wallet: m.wallet, group: m.group as Group })),
  };
}
/** Every venue, newest first: a public directory, so a customer without a link can still find theirs. */
export async function listVenues(): Promise<Venue[]> {
  const n = await venueCount();
  return Promise.all(Array.from({ length: n }, (_, i) => readVenue(n - 1 - i)));
}
/** The venues this wallet runs now, newest first. */
export async function myVenues(admin: string): Promise<Venue[]> {
  const data = await call(WEEP, encodeFunctionData({ abi, functionName: "venuesOf", args: [admin as `0x${string}`] }));
  const ids = [...new Set(decodeFunctionResult({ abi, functionName: "venuesOf", data }).map(Number))];
  const all = await Promise.all(ids.map(readVenue));
  return all.filter((v) => v.admin === admin.toLowerCase()).reverse();
}

export async function ausdBalance(owner: string) {
  return BigInt(await call(AUSD, SEL.balanceOf + word(owner)));
}
export async function ausdAllowance(owner: string, spender: string) {
  return BigInt(await call(AUSD, SEL.allowance + word(owner) + word(spender)));
}
export async function monBalance(owner: string) {
  return BigInt(await rpc<string>("eth_getBalance", [owner, "latest"]));
}

/** Dollars (2 decimals) ⇄ AUSD base units (18 decimals). */
const CENT = BigInt(10) ** BigInt(16);       // one cent in AUSD base units
const BASIS = BigInt(10) ** BigInt(14);      // 1/10,000 of a dollar
export const toUnits = (dollars: number) => BigInt(Math.round(dollars * 100)) * CENT;
export const toDollars = (units: bigint) => Number(units / BASIS) / 10000;

export const approveData = (spender: string, units: bigint) => (SEL.approve + word(spender) + word(units.toString(16))) as `0x${string}`;
export const mintData = (to: string, units: bigint) => (SEL.mint + word(to) + word(units.toString(16))) as `0x${string}`;
export const tipTeamData = (venueId: number, units: bigint) => encodeFunctionData({ abi, functionName: "tipTeam", args: [BigInt(venueId), units] });
export const tipPersonData = (venueId: number, name: string, units: bigint) =>
  encodeFunctionData({ abi, functionName: "tipPerson", args: [BigInt(venueId), name, units] });

type Setup = { name: string; split: Split; team: Member[] };
const venueArgs = ({ name, split, team }: Setup) =>
  [name, [split.foh, split.boh, split.bar], team.map((m) => m.name), team.map((m) => m.wallet as `0x${string}`), team.map((m) => m.group)] as const;
export const createVenueData = (s: Setup) => encodeFunctionData({ abi, functionName: "createVenue", args: venueArgs(s) });
export const updateVenueData = (id: number, s: Setup) => encodeFunctionData({ abi, functionName: "updateVenue", args: [BigInt(id), ...venueArgs(s)] });

/**
 * Each group's share of a team tip in whole cents, as the contract pays it: a group with nobody in it hands
 * its share to the others, and largest-remainder rounding keeps the parts summing to the tip exactly.
 */
export function teamShares(split: Split, team: Member[], dollars: number): Split {
  const counts = [0, 0, 0];
  team.forEach((m) => counts[m.group]++);
  const pct = [split.foh, split.boh, split.bar].map((p, g) => (team.length === 0 || counts[g] > 0 ? p : 0));
  const active = pct.reduce((a, b) => a + b, 0) || 1;
  const cents = Math.round(dollars * 100);
  const exact = pct.map((p) => (cents * p) / active);
  const base = exact.map(Math.floor);
  let left = cents - base.reduce((a, b) => a + b, 0);
  exact.map((x, g) => ({ g, r: x - base[g] })).sort((a, b) => b.r - a.r).forEach(({ g }) => { if (left > 0 && pct[g] > 0) { base[g]++; left--; } });
  return { foh: base[0] / 100, boh: base[1] / 100, bar: base[2] / 100 };
}

/** The venue a confirmed createVenue made, read from its receipt. */
export async function createdVenueId(hash: string): Promise<number | null> {
  const r = await rpc<{ logs: { address: string; topics: string[] }[] } | null>("eth_getTransactionReceipt", [hash]);
  const log = r?.logs.find((l) => l.address.toLowerCase() === WEEP.toLowerCase() && l.topics[0] === VENUE_CREATED);
  return log ? Number(BigInt(log.topics[1])) : null;
}

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
