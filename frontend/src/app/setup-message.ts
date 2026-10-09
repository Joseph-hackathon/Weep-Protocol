/**
 * Where business pools live, and the exact text a business signs to let Weep create wallets for its team.
 * Shared by the merchant page and the server route, so both always build the same string.
 *   WEEP_POOLS: the factory. Every business gets its own pool (TipPool) from it, at an address known in advance.
 *   SHARED_POOL: the first, shared pool (TipSplitter), still readable by older links and codes.
 */
export const WEEP_POOLS = (process.env.NEXT_PUBLIC_WEEP_POOLS || "0x5b9f33a6db109314f4720dd28a5bed9C1Ef53210") as `0x${string}`;
export const SHARED_POOL = (process.env.NEXT_PUBLIC_TIP_SPLITTER || "0x06db4c849EF42653982694Ae924dC99DBB80EA35") as `0x${string}`;

export function setupMessage(emails: string[], issuedAt: string, pool: string) {
  return `Weep team setup\nPool: ${pool.toLowerCase()}\nEmails: ${[...emails].sort().join(", ")}\nIssued: ${issuedAt}`;
}
