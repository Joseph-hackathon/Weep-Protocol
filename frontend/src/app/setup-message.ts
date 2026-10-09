/**
 * Where business pools live, and the exact text a business signs to let Weep create wallets for its team.
 * Shared by the merchant page and the server route, so both always build the same string.
 * WEEP_POOLS is the factory: every business gets its own pool (TipPool) from it, at an address known in advance.
 * It is set per deployment (NEXT_PUBLIC_WEEP_POOLS); a production build without it stops (next.config.ts).
 */
export const WEEP_POOLS = (process.env.NEXT_PUBLIC_WEEP_POOLS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

export function setupMessage(emails: string[], issuedAt: string, pool: string) {
  return `Weep team setup\nPool: ${pool.toLowerCase()}\nEmails: ${[...emails].sort().join(", ")}\nIssued: ${issuedAt}`;
}
