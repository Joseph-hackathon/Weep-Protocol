/**
 * The Weep venues contract on Monad (any business opens its own venue there), and the exact text a
 * merchant signs to let Weep create wallets for their team. Shared by the merchant page and the server
 * route, so both always build the same string.
 */
export const WEEP = (process.env.NEXT_PUBLIC_WEEP || "0x4026433687A8324198Ef3FC56d09FccC6e672178") as `0x${string}`;

export function setupMessage(emails: string[], issuedAt: string) {
  return `Weep team setup\nVenues: ${WEEP}\nEmails: ${[...emails].sort().join(", ")}\nIssued: ${issuedAt}`;
}
