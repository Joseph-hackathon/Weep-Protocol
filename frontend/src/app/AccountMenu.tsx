"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, ChevronDown, Copy, Eye, EyeOff, LogOut, RefreshCw, Wallet } from "lucide-react";

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

type Props = {
  address: string;
  networkName: string;
  via?: string;               // how they signed in: wallet name or email
  onRightNetwork: boolean;
  balance: string | null;      // MON (network fees), formatted; null while loading
  balanceSymbol: string;
  dollars: string | null;      // test dollars (AUSD), formatted with $; null while loading
  explorerUrl: string;
  onSwitchNetwork: () => void;
  onDisconnect: () => void;
};

const HIDE_KEY = "weep.balanceHidden";
const ITEMS = "[role=menuitem], [role=menuitemcheckbox]";

const enter = { duration: 0.15, ease: [0, 0, 0.38, 0.9] as const };   // motion-medium-1, entrance
const exit = { duration: 0.11, ease: [0.2, 0, 1, 0.9] as const };     // motion-fast-2, exit

/** The connected account: one button in the header, one panel beneath it. */
export default function AccountMenu(p: Props) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [viaKeyboard, setViaKeyboard] = useState(false);
  const [copied, setCopied] = useState(false);
  // Remembered per browser. This component only renders once a wallet is connected (client-side), so reading storage here is safe.
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(HIDE_KEY) === "1"; } catch { return false; }
  });
  const toggleHidden = () => {
    setHidden((h) => {
      try { localStorage.setItem(HIDE_KEY, h ? "0" : "1"); } catch {}
      return !h;
    });
  };
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    // Keyboard: land on the first action. Pointer: focus the panel itself, so arrows/Esc work without a ring.
    if (viaKeyboard) panel.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    else panel.current?.focus();
    const onDown = (e: PointerEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, viaKeyboard]);

  const onKey = (e: React.KeyboardEvent) => {
    const items = [...(panel.current?.querySelectorAll<HTMLElement>(ITEMS) ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === "Home") { e.preventDefault(); items[0]?.focus(); }
    else if (e.key === "End") { e.preventDefault(); items[items.length - 1]?.focus(); }
    else if (e.key === "Tab") close(false);
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(p.address); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="connect-wrap" ref={wrap} onKeyDown={onKey}>
      <button
        ref={trigger}
        type="button"
        className="btn-account"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account ${short(p.address)}${p.onRightNetwork ? "" : ", on the wrong network"}`}
        onClick={(e) => { setViaKeyboard(e.detail === 0); setOpen((o) => !o); }}
      >
        <span className={p.onRightNetwork ? "acct-dot" : "acct-dot is-wrong"} aria-hidden />
        <span className="account-address">{short(p.address)}</span>
        <ChevronDown size={14} strokeWidth={2.25} aria-hidden className="account-chevron" data-open={open} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panel}
            id={menuId}
            role="menu"
            aria-label="Account"
            tabIndex={-1}
            className="account-panel"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: reduce ? { duration: 0.11 } : enter }}
            exit={{ opacity: 0, y: reduce ? 0 : -4, scale: reduce ? 1 : 0.98, transition: exit }}
          >
            {/* Identity */}
            <div className="panel-identity">
              <span className="panel-avatar" aria-hidden><Wallet size={20} strokeWidth={1.75} /></span>
              <div className="panel-identity-text">
                <span className="panel-address">{short(p.address)}</span>
                {p.onRightNetwork
                  ? <span className="panel-network"><span className="network-dot" aria-hidden />{p.networkName}</span>
                  : <span className="panel-network is-wrong"><span className="network-dot" aria-hidden />Not on {p.networkName}</span>}
                {p.via && <span className="panel-via" title={p.via}>{p.via}</span>}
              </div>
            </div>

            {/* Balance: what people think in (test dollars) first, then the MON that pays network fees */}
            <div className="panel-balance">
              <div className="panel-balance-head">
                <span className="panel-label" id={`${menuId}-bal`}>Test dollars</span>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={hidden}
                  aria-label={hidden ? "Show balances" : "Hide balances"}
                  title={hidden ? "Show balances" : "Hide balances"}
                  className="icon-btn"
                  onClick={toggleHidden}
                >
                  {hidden ? <EyeOff size={16} strokeWidth={1.75} aria-hidden /> : <Eye size={16} strokeWidth={1.75} aria-hidden />}
                </button>
              </div>
              <span className="panel-balance-value" aria-labelledby={`${menuId}-bal`}>
                {p.dollars === null
                  ? <span className="balance-skeleton" aria-label="Loading balance" />
                  : hidden ? <span className="balance-masked" aria-label="Balance hidden">••••••</span> : p.dollars}
              </span>
              <span className="panel-fee-line">
                {p.balance === null ? "Reading MON…" : hidden ? "MON for network fees · ••••" : `${p.balance} ${p.balanceSymbol} for network fees`}
              </span>
            </div>

            <div className="panel-divider" role="separator" />

            {/* Actions */}
            {!p.onRightNetwork && (
              <button type="button" role="menuitem" className="panel-item is-warning" onClick={() => { close(); p.onSwitchNetwork(); }}>
                <RefreshCw size={20} strokeWidth={1.75} aria-hidden />
                <span>Switch to {p.networkName}</span>
              </button>
            )}
            <button type="button" role="menuitem" className="panel-item" onClick={copy}>
              {copied ? <Check size={20} strokeWidth={1.75} aria-hidden className="text-ok" /> : <Copy size={20} strokeWidth={1.75} aria-hidden />}
              <span aria-live="polite">{copied ? "Address copied" : "Copy address"}</span>
            </button>
            <a role="menuitem" className="panel-item" href={p.explorerUrl} target="_blank" rel="noreferrer" onClick={() => close(false)}>
              <ArrowUpRight size={20} strokeWidth={1.75} aria-hidden />
              <span>View on explorer</span>
            </a>
            <button type="button" role="menuitem" className="panel-item is-danger" onClick={() => { close(); p.onDisconnect(); }}>
              <LogOut size={20} strokeWidth={1.75} aria-hidden />
              <span>Disconnect</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
