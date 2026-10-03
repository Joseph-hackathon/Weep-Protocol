"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny bridge between pages and the lazily loaded wallet stack (AccountDock → ConnectButton).
 * Pages read the account and ask for transactions through here, so they never import Privy and stay
 * light; ConnectButton publishes into it once the wallet stack has loaded.
 */
export type Tx = { to: `0x${string}`; data: `0x${string}` };
export type WalletState = {
  address: `0x${string}` | null;
  onMonad: boolean;
  /** Asks the connected wallet to send a transaction; resolves with its hash. */
  send: ((tx: Tx) => Promise<`0x${string}`>) | null;
  /** Asks the connected wallet to sign a plain-text message (proves who is acting); resolves with the signature. */
  sign: ((message: string) => Promise<`0x${string}`>) | null;
  /** How they signed in: their email, or their wallet's name. */
  via: string | null;
};

const EMPTY: WalletState = { address: null, onMonad: false, send: null, sign: null, via: null };
let state: WalletState = EMPTY;
const listeners = new Set<() => void>();

export function publishWallet(next: WalletState | null) {
  state = next ?? EMPTY;
  listeners.forEach((l) => l());
}

export function useWallet(): WalletState {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => EMPTY,
  );
}

/** Open Weep's sign-in window (loads the wallet stack first if it isn't loaded yet). */
export function requestConnect() {
  window.dispatchEvent(new Event("weep:connect"));
}
