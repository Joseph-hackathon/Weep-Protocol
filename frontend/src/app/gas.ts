"use client";

import { monBalance, waitForReceipt } from "./chain";
import type { WalletState } from "./wallet-bridge";

/**
 * Makes sure a wallet can pay Monad's network fee before Weep asks it to send anything.
 * Enough MON already: carry on. An email wallet that's short: Weep covers it (POST /api/gas, from Weep's
 * sponsor wallet), and this waits until it lands. Anything else, or if covering isn't switched on: false, and
 * the page points to Monad's faucet.
 */
const ENOUGH = BigInt(5) * BigInt(10) ** BigInt(16); // 0.05 MON, the same line the server uses

export async function ensureGas(wallet: WalletState): Promise<boolean> {
  if (!wallet.address) return false;
  const balance = await monBalance(wallet.address);
  if (balance >= ENOUGH) return true;
  if (wallet.token) {
    try {
      const token = await wallet.token();
      if (token) {
        const res = await fetch("/api/gas", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ address: wallet.address }),
        });
        const data = (await res.json().catch(() => ({}))) as { hash?: string };
        if (res.ok && data.hash) await waitForReceipt(data.hash, 30000);
        if ((await monBalance(wallet.address)) > balance) return true;
      }
    } catch {}
  }
  return balance > BigInt(0); // a little MON may still be enough; with none at all, the faucet it is
}
