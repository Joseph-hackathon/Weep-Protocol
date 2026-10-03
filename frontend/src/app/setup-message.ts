/**
 * The exact text a merchant signs to let Weep create wallets for their team. Shared by the merchant page
 * and the server route, so both always build the same string.
 */
export const TIP_SPLITTER = (process.env.NEXT_PUBLIC_TIP_SPLITTER || "0x1A245Dc83F286CA5A6833626E813776623f9F336") as `0x${string}`;

export function setupMessage(emails: string[], issuedAt: string) {
  return `Weep team setup\nPool: ${TIP_SPLITTER}\nEmails: ${[...emails].sort().join(", ")}\nIssued: ${issuedAt}`;
}
