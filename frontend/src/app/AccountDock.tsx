"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * The header's right-hand slot, mounted once in the root layout so the account survives page changes.
 *
 * Speed: the wallet stack (Privy, WalletConnect…) is ~1 MB — most of the app — and no page needs it to
 * paint. So it is only fetched when it can matter:
 *   - someone who was signed in returns → load when the browser is idle, so their account restores;
 *   - anyone points at, focuses or presses Connect (or a page asks to sign in) → load right then.
 * A first-time visitor never downloads it just to look. Until it arrives, a Connect button that is
 * pixel-identical to the real signed-out one holds the slot; a press opens the sign-in window on arrival.
 */
const AccountArea = dynamic(() => import("./AccountArea"), { ssr: false, loading: () => <Placeholder /> });

let pressedEarly = false; // survives the placeholder → real button swap

/** A saved session this browser could restore (and the visitor didn't sign out on purpose). */
function wasSignedIn() {
  try {
    if (localStorage.getItem("weep.signedOut") === "1") return false;
    return Object.keys(localStorage).some((k) => k === "weep.lastWallet" || k.startsWith("privy:"));
  } catch {
    return false;
  }
}

function Placeholder({ onWant }: { onWant?: (open: boolean) => void }) {
  return (
    <button
      type="button"
      className="btn-connect"
      onPointerEnter={() => onWant?.(false)}
      onFocus={() => onWant?.(false)}
      onClick={() => { pressedEarly = true; onWant?.(true); }}
      aria-busy={pressedEarly || undefined}
    >
      <span className="btn-label">Connect</span>
    </button>
  );
}

export default function AccountDock() {
  const [load, setLoad] = useState(false);

  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = wasSignedIn() ? idle(() => setLoad(true), { timeout: 2500 }) : undefined;
    // "Get started" and other in-page calls to sign in also wake the stack.
    const wake = () => { pressedEarly = true; setLoad(true); };
    window.addEventListener("weep:connect", wake);
    return () => { if (id !== undefined) cancel(id); window.removeEventListener("weep:connect", wake); };
  }, []);

  return (
    <div className="account-dock">
      <div className="page site-header-row account-dock-row">
        {load ? <AccountArea openOnMount={pressedEarly} /> : <Placeholder onWant={() => setLoad(true)} />}
      </div>
    </div>
  );
}
