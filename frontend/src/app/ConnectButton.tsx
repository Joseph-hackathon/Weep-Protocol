"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConnectWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { createPublicClient, formatEther, http } from "viem";
import { monadTestnet } from "viem/chains";
import AccountMenu from "./AccountMenu";
import ConnectModal from "./ConnectModal";
import { saveLastMethod } from "./last-method";
import { MONAD_CHAIN, directProvider, disconnectDirect, forgetSavedConnections, setSignedOut, switchDirect, switchProvider, useDirectWallets, useSignedOut, type Eip1193 } from "./wallet-store";
import { publishWallet, type Tx } from "./wallet-bridge";
import { ausdBalance, toDollars } from "./chain";

const client = createPublicClient({ chain: monadTestnet, transport: http() });
const MONAD = `eip155:${monadTestnet.id}`;

/** Live native balance, refreshed every 10s while connected. */
function useBalance(address?: string) {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    if (!address) return;
    let live = true;
    const read = async () => {
      try {
        const wei = await client.getBalance({ address: address as `0x${string}` });
        const n = Number(formatEther(wei));
        if (live) setValue(n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 4 : 2 }));
      } catch {}
    };
    read();
    const id = setInterval(read, 10000);
    return () => { live = false; clearInterval(id); };
  }, [address]);
  return address ? value : null;
}

/** Live test-dollar (AUSD) balance, refreshed every 10s while connected. */
function useDollars(address?: string) {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    if (!address) return;
    let live = true;
    const read = async () => {
      try {
        const d = toDollars(await ausdBalance(address));
        if (live) setValue(`$${d.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      } catch {}
    };
    read();
    const id = setInterval(read, 10000);
    return () => { live = false; clearInterval(id); };
  }, [address]);
  return address ? value : null;
}

/**
 * Header action, right-aligned to the page margin.
 * Signed out: "Connect" opens Weep's sign-in window (email code, Google, Apple, or a wallet).
 * Connected: the account button and panel. Wrong network: "Switch to Monad".
 */
/** `openOnMount`: the visitor clicked Connect before this (lazy-loaded) button arrived, so open straight away. */
export default function ConnectButton({ openOnMount = false }: { openOnMount?: boolean }) {
  const reduce = useReducedMotion();
  const { ready, authenticated, user, logout } = usePrivy();
  const { wallets: privyWallets } = useWallets();
  const { account: direct } = useDirectWallets();
  const signedOut = useSignedOut();
  const [modalOpen, setModalOpen] = useState(openOnMount);
  const [toast, setToast] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const userStarted = useRef(false);

  // Connecting through Privy's window (phone QR / All wallets) is an active choice: clear the signed-out flag.
  const privyMethod = useRef<"all" | null>(null);
  const { connectWallet } = useConnectWallet({
    onSuccess: () => {
      setSignedOut(false);
      if (privyMethod.current) saveLastMethod({ type: privyMethod.current });
    },
  });

  // One account, whichever way the person signed in. After a disconnect, external wallets that
  // quietly reconnect are ignored until the person connects again.
  const visibleWallets = signedOut ? privyWallets.filter((w) => w.walletClientType === "privy" && authenticated) : privyWallets;
  const privyWallet = visibleWallets.find((w) => w.walletClientType === "privy") ?? visibleWallets[0];
  const address = direct?.address ?? privyWallet?.address ?? (authenticated ? user?.wallet?.address : undefined);
  const onRightNetwork = direct ? direct.chainId === monadTestnet.id : !privyWallet?.chainId || privyWallet.chainId === MONAD;
  const via = direct?.wallet.name ?? user?.email?.address ?? undefined;
  const settingUp = authenticated && !address; // signed in; Privy is creating the wallet
  const balance = useBalance(address);
  const dollars = useDollars(address);

  // Share the account with pages through the wallet bridge, so a page can ask for a payment without
  // loading this stack itself. The wallet shows its own confirmation; we only pass the transaction on.
  useEffect(() => {
    if (!address) { publishWallet(null); return; }
    const send = async (tx: Tx) => {
      const provider = direct ? directProvider() : privyWallet ? ((await privyWallet.getEthereumProvider()) as unknown as Eip1193) : null;
      if (!provider) throw new Error("Your wallet is still being set up. Try again in a moment.");
      return (await provider.request({ method: "eth_sendTransaction", params: [{ from: address, to: tx.to, data: tx.data }] })) as `0x${string}`;
    };
    publishWallet({ address: address as `0x${string}`, onMonad: onRightNetwork, send });
    return () => publishWallet(null);
  }, [address, onRightNetwork, direct, privyWallet]);

  // A new sign-in (not-connected → connected) clears the signed-out flag. Watching transitions, not state,
  // means the brief moment while a sign-out completes can't undo it.
  // Session restores on page load aren't sign-ins, so watching starts only once Privy is ready.
  const prevDirect = useRef(direct);
  const prevAuthed = useRef<boolean | null>(null);
  useEffect(() => {
    if (!prevDirect.current && direct) setSignedOut(false);
    prevDirect.current = direct;
  }, [direct]);
  useEffect(() => {
    if (!ready) return;
    if (prevAuthed.current === false && authenticated) setSignedOut(false);
    prevAuthed.current = authenticated;
  }, [ready, authenticated]);

  // Confirm a connection the person just made (not silent reconnects on page load).
  useEffect(() => {
    if (!address || !userStarted.current) return;
    userStarted.current = false;
    setToast(true);
    const id = setTimeout(() => setToast(false), 2400);
    return () => clearTimeout(id);
  }, [address]);

  const openModal = () => { userStarted.current = true; setModalOpen(true); };

  // "Get started" (and any other entry point) opens this same window; if already connected, focus the account.
  useEffect(() => {
    const onConnect = () => {
      if (address) document.querySelector<HTMLButtonElement>(".btn-account")?.focus();
      else { userStarted.current = true; setModalOpen(true); }
    };
    window.addEventListener("weep:connect", onConnect);
    return () => window.removeEventListener("weep:connect", onConnect);
  }, [address]);
  // Pages that asked for a sign-in (wallet bridge) learn when the window closes, signed in or not.
  const closeModal = useCallback(() => { setModalOpen(false); window.dispatchEvent(new Event("weep:connect-closed")); }, []);

  // The complete directory (600+ wallets, searchable), for anything not installed or not listed above
  const onAllWallets = () => {
    setModalOpen(false);
    privyMethod.current = "all";
    connectWallet({ walletList: ["detected_ethereum_wallets", "metamask", "phantom", "coinbase_wallet", "okx_wallet", "rainbow", "wallet_connect"] });
  };

  const walletName = direct?.wallet.name ?? privyWallet?.meta?.name ?? "your wallet";

  const switchNetwork = async () => {
    setSwitching(true); setSwitchError(null);
    // If the wallet stays silent, say how to fix it after 8s instead of spinning for the whole timeout
    const hint = setTimeout(() => setSwitchError(/phantom/i.test(walletName)
      ? "No answer from Phantom. Open Phantom, turn on Testnet Mode and enable Monad in its networks, then press Switch again."
      : `No answer from ${walletName}. Open it, approve the request, or pick ${monadTestnet.name} there.`), 8000);
    try {
      if (direct) {
        await switchDirect(MONAD_CHAIN);
      } else if (privyWallet && privyWallet.walletClientType !== "privy") {
        // Wallet connected through Privy's window: use the same robust switch on its own provider
        const provider = await privyWallet.getEthereumProvider();
        const name = privyWallet.meta?.name || "Your wallet";
        await switchProvider(provider as unknown as Eip1193, name, MONAD_CHAIN);
      } else {
        await privyWallet?.switchChain(monadTestnet.id);
      }
    } catch (e) {
      setSwitchError((e as Error)?.message || `Couldn't switch. Open your wallet and choose ${monadTestnet.name}.`);
    }
    clearTimeout(hint);
    setSwitching(false);
  };

  const disconnect = () => {
    setSignedOut(true);            // takes effect immediately, even if a wallet doesn't support disconnecting
    if (direct) disconnectDirect();
    privyWallets.forEach((w) => {
      if (w.walletClientType === "privy") return;
      try { w.disconnect(); } catch {}
      // Ask the wallet to drop this site's access where supported (MetaMask does; others ignore it)
      w.getEthereumProvider()
        .then((p) => p.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] }))
        .catch(() => {});
    });
    forgetSavedConnections();
    if (authenticated) logout().catch(() => {});
    setSwitchError(null);
  };

  return (
    <div className="header-action">
      {!address ? (
        // Same label and width while busy; the spinner takes the label's place so nothing shifts.
        <button
          type="button"
          className="btn-connect"
          onClick={openModal}
          aria-busy={settingUp || !ready}
          disabled={settingUp}
          aria-haspopup="dialog"
        >
          <span className="btn-label">Connect</span>
          {settingUp && <span className="btn-spinner" aria-hidden />}
          {settingUp && <span className="sr-only">Setting up your wallet</span>}
        </button>
      ) : (
        <AccountMenu
          address={address}
          networkName={monadTestnet.name}
          via={via}
          onRightNetwork={onRightNetwork}
          balance={balance}
          balanceSymbol={monadTestnet.nativeCurrency.symbol}
          dollars={dollars}
          explorerUrl={`${monadTestnet.blockExplorers.default.url}/address/${address}`}
          onSwitchNetwork={switchNetwork}
          onDisconnect={disconnect}
        />
      )}

      <ConnectModal
        open={modalOpen}
        onClose={closeModal}
        onAllWallets={onAllWallets}
      />

      <div aria-live="polite" className="toast-anchor">
        <AnimatePresence>
          {address && !onRightNetwork && (
            <motion.div
              key="network"
              className="notice"
              role="status"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: [0, 0, 0.38, 0.9] } }}
              exit={{ opacity: 0, transition: { duration: 0.15, ease: [0.2, 0, 1, 0.9] } }}
            >
              <span className="notice-row">
                <TriangleAlert size={16} strokeWidth={2} aria-hidden className="notice-icon" />
                <span className="notice-text">Your wallet is on another network.</span>
                <button type="button" className="notice-btn" onClick={switchNetwork} disabled={switching}>
                  {switching ? <><Loader2 size={16} className="cm-spin" aria-hidden /> Switching</> : "Switch to Monad"}
                </button>
              </span>
              {switchError && <span className="notice-error" role="alert">{switchError}</span>}
            </motion.div>
          )}
          {toast && onRightNetwork && (
            <motion.div
              key="toast"
              className="toast"
              role="status"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: [0, 0, 0.38, 0.9] } }}
              exit={{ opacity: 0, transition: { duration: 0.15, ease: [0.2, 0, 1, 0.9] } }}
            >
              <Check size={16} strokeWidth={2.25} aria-hidden className="text-ok" />
              Wallet connected
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
