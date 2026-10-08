import { PAY } from "./pay";

/**
 * The exact text a sender signs so Weep can reach the people they're paying by email: each email gets its
 * wallet (made now if they're new), which they open by signing in with that email. Shared by the Send page
 * and the server route, so both always build the same string.
 */
export function sendMessage(emails: string[], issuedAt: string) {
  return `Weep: reach these people by email\nPayments: ${PAY}\nEmails: ${[...emails].sort().join(", ")}\nIssued: ${issuedAt}`;
}
