"use client";

/**
 * Direct browser-wallet connection (EIP-6963 discovery + EIP-1193 requests).
 * Installed wallets announce themselves, so we can list the ones you actually have, first,
 * and connect in one approval with no extra sign-in message.
 */
import { useSyncExternalStore } from "react";
import { monadTestnet } from "viem/chains";

export type Eip1193 = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, fn: (...a: unknown[]) => void) => void;
  removeListener?: (event: string, fn: (...a: unknown[]) => void) => void;
};
export type WalletInfo = { uuid: string; name: string; icon: string; rdns: string };
type Detail = { info: WalletInfo; provider: Eip1193 };
export type DirectAccount = { address: string; chainId: number; wallet: WalletInfo };

const LAST_KEY = "weep.lastWallet";

let wallets: Detail[] = [];
let account: DirectAccount | null = null;
let snapshot = { wallets: [] as WalletInfo[], account: null as DirectAccount | null };
const listeners = new Set<() => void>();
const emit = () => {
  snapshot = { wallets: wallets.map((w) => w.info), account };
  listeners.forEach((l) => l());
};

let started = false;
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("eip6963:announceProvider", ((e: CustomEvent<Detail>) => {
    if (wallets.some((w) => w.info.rdns === e.detail.info.rdns)) return;
    wallets = [...wallets, e.detail];
    emit();
    // Quietly restore the last wallet once it announces itself (no popup: eth_accounts never prompts)
    const last = safeGet(LAST_KEY);
    if (!account && last === e.detail.info.rdns) void restore(e.detail);
  }) as EventListener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

const safeGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} };

function bind(d: Detail, address: string, chainId: number) {
  account = { address, chainId, wallet: d.info };
  const onAccounts = (a: unknown) => {
    const list = a as string[];
    if (!list?.length) { disconnectDirect(); return; }
    if (account) { account = { ...account, address: list[0] }; emit(); }
  };
  const onChain = (c: unknown) => {
    if (account) { account = { ...account, chainId: Number(c) }; emit(); }
  };
  d.provider.on?.("accountsChanged", onAccounts);
  d.provider.on?.("chainChanged", onChain);
  unbind = () => {
    d.provider.removeListener?.("accountsChanged", onAccounts);
    d.provider.removeListener?.("chainChanged", onChain);
  };
  emit();
}
let unbind: (() => void) | null = null;

async function restore(d: Detail) {
  try {
    const accts = (await d.provider.request({ method: "eth_accounts" })) as string[];
    if (!accts?.length) return;
    const chain = Number(await d.provider.request({ method: "eth_chainId" }));
    bind(d, accts[0], chain);
  } catch {}
}

/**
 * Ask one installed wallet to connect. Resolves with the account, or throws with a readable message.
 * With a target chain, the wallet is asked to move there straight away, so people rarely see "wrong network".
 */
export async function connectDirect(rdns: string, target?: ChainSpec): Promise<DirectAccount> {
  const connected = await connectOnly(rdns);
  if (target && connected.chainId !== target.id) await switchDirect(target).catch(() => {}); // declining leaves the notice in the header
  return account!;
}

async function connectOnly(rdns: string): Promise<DirectAccount> {
  const d = wallets.find((w) => w.info.rdns === rdns);
  if (!d) throw new Error("That wallet is no longer available. Reload the page and try again.");
  try {
    const accts = (await d.provider.request({ method: "eth_requestAccounts" })) as string[];
    const chain = Number(await d.provider.request({ method: "eth_chainId" }));
    bind(d, accts[0], chain);
    safeSet(LAST_KEY, rdns);
    return account!;
  } catch (e) {
    const code = (e as { code?: number })?.code;
    if (code === 4001) throw new Error("You declined the request in your wallet. Try again when you're ready.");
    if (code === -32002) throw new Error(`${d.info.name} already has a request open. Check the wallet window.`);
    throw new Error(`Couldn't connect to ${d.info.name}. Unlock it and try again.`);
  }
}

export function disconnectDirect() {
  const d = account && wallets.find((w) => w.info.rdns === account!.wallet.rdns);
  d?.provider.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] }).catch(() => {});
  unbind?.(); unbind = null;
  account = null;
  safeSet(LAST_KEY, null);
  emit();
}

export type ChainSpec = { id: number; name: string; rpc: string; explorer: string; symbol: string };
export const MONAD_CHAIN: ChainSpec = {
  id: monadTestnet.id, name: monadTestnet.name, rpc: monadTestnet.rpcUrls.default.http[0],
  explorer: monadTestnet.blockExplorers.default.url, symbol: monadTestnet.nativeCurrency.symbol,
};

/** Wallets report "I don't know this network" in different ways; catch them all. */
function isUnknownChain(e: unknown) {
  const err = e as { code?: number; message?: string; data?: { originalError?: { code?: number } } };
  const code = err?.data?.originalError?.code ?? err?.code;
  const msg = err?.message ?? "";
  return code === 4902
    || (code === -32603 && /unrecognized|unknown|not added|add/i.test(msg))
    || /unrecognized chain|unknown chain|chain .* not (been )?added|try adding the chain/i.test(msg);
}
const isRejected = (e: unknown) => {
  const err = e as { code?: number; data?: { originalError?: { code?: number } } };
  return (err?.data?.originalError?.code ?? err?.code) === 4001;
};

const isPhantom = (name: string) => /phantom/i.test(name);
const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej({ code: "TIMEOUT" }), ms))]);

/**
 * Move any EIP-1193 wallet to the given chain: switch, or add it first if the wallet doesn't know it.
 * Every failure becomes one sentence that says what happened and what to do (manual §11.4).
 */
export async function switchProvider(provider: Eip1193, walletName: string, chain: ChainSpec) {
  const hex = `0x${chain.id.toString(16)}`;
  const phantomHelp = `In Phantom, turn on Testnet Mode (Settings → Developer Settings), then try again.`;
  const doSwitch = () => withTimeout(provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] }), 60000);
  try {
    await doSwitch();
  } catch (e) {
    if ((e as { code?: string })?.code === "TIMEOUT") throw new Error(`${walletName} is waiting for you. Approve the switch to ${chain.name} in its window.`);
    if (isRejected(e)) throw new Error(`Switch declined. Approve the switch to ${chain.name} in ${walletName}.`);
    if (isPhantom(walletName)) throw new Error(phantomHelp); // Phantom can't add networks; Monad shows only in Testnet Mode
    if (!isUnknownChain(e)) {
      const detail = (e as { message?: string })?.message;
      throw new Error(`${walletName} couldn't switch to ${chain.name}${detail ? ` (${detail.slice(0, 80)})` : ""}. Switch networks in the wallet.`);
    }
    try {
      await withTimeout(provider.request({
        method: "wallet_addEthereumChain",
        params: [{ chainId: hex, chainName: chain.name, rpcUrls: [chain.rpc], blockExplorerUrls: [chain.explorer], nativeCurrency: { name: chain.symbol, symbol: chain.symbol, decimals: 18 } }],
      }), 60000);
      await doSwitch().catch(() => {}); // most wallets switch on add; this covers the ones that don't
    } catch (e2) {
      if ((e2 as { code?: string })?.code === "TIMEOUT") throw new Error(`${walletName} is waiting for you. Approve adding ${chain.name} in its window.`);
      if (isRejected(e2)) throw new Error(`Adding ${chain.name} was declined. Approve it in ${walletName} to continue.`);
      throw new Error(`${walletName} couldn't add ${chain.name}. Add it in the wallet, then try again.`);
    }
  }
  return Number(await provider.request({ method: "eth_chainId" }).catch(() => 0));
}

/** Switch the directly connected wallet, then refresh its chain (some wallets don't emit chainChanged). */
export async function switchDirect(chain: ChainSpec) {
  const d = account && wallets.find((w) => w.info.rdns === account!.wallet.rdns);
  if (!d) return;
  const now = await switchProvider(d.provider, d.info.name, chain);
  if (now && account && account.chainId !== now) { account = { ...account, chainId: now }; emit(); }
}

/* ── Signed-out flag ───────────────────────────────────────────────────────────
   Some wallets (Phantom, and anything connected through Privy's window) keep telling the site
   "this address is allowed", so they silently come back after a disconnect. Weep remembers that
   the person chose to sign out and ignores those wallets until they actively connect again. */
const OUT_KEY = "weep.signedOut";
const outListeners = new Set<() => void>();
export function setSignedOut(v: boolean) {
  safeSet(OUT_KEY, v ? "1" : null);
  outListeners.forEach((l) => l());
}
export function useSignedOut() {
  return useSyncExternalStore(
    (l) => { outListeners.add(l); return () => outListeners.delete(l); },
    () => safeGet(OUT_KEY) === "1",
    () => false,
  );
}

/** Forget every saved connection this browser holds for Weep (Privy + wagmi), so nothing reconnects by itself. */
export function forgetSavedConnections() {
  try {
    Object.keys(localStorage)
      .filter((k) => k === "privy:connections" || k.includes("active-wallet-connection") || k === "wagmi.store" || k.startsWith("wagmi.") || k.includes("recentConnectorId"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
}

const serverSnapshot = { wallets: [] as WalletInfo[], account: null as DirectAccount | null };
export function useDirectWallets() {
  return useSyncExternalStore(
    (l) => { start(); listeners.add(l); return () => listeners.delete(l); },
    () => snapshot,
    () => serverSnapshot,
  );
}

/** The provider of the wallet connected directly (EIP-6963), for sending transactions. */
export function directProvider(): Eip1193 | null {
  if (!account) return null;
  const id = account.wallet.uuid;
  return wallets.find((w) => w.info.uuid === id)?.provider ?? null;
}
