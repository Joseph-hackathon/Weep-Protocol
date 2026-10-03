"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, Copy, HandCoins, Sparkles, Wallet } from "lucide-react";
import Kinetic from "../Kinetic";
import { requestConnect, useWallet } from "../wallet-bridge";
import { EXPLORER, ausdBalance, toDollars } from "../chain";

/**
 * Employee space (DOCS.md §4.2): sign in with the email the manager added (the wallet was created for
 * them already), then see tips in dollars, live. Payouts are pushed to the wallet, so there is nothing
 * to claim; new arrivals are celebrated the moment the balance moves.
 */
const POLL_MS = 4000;
const EASE = [0.2, 0.8, 0.2, 1] as const;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const usd = (d: number) => `$${d.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ago = (t: number, now: number) => {
  const s = Math.max(0, Math.round((now - t) / 1000));
  return s < 45 ? "just now" : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`;
};

export default function TipsHome() {
  const reduce = useReducedMotion();
  const wallet = useWallet();
  const address = wallet.address;
  const [balance, setBalance] = useState<{ of: string; dollars: number } | null>(null);
  const [arrivals, setArrivals] = useState<{ id: number; dollars: number; at: number }[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const last = useRef<{ of: string; dollars: number } | null>(null);

  // Live balance; any increase is a tip that just landed.
  useEffect(() => {
    if (!address) return;
    let live = true;
    const read = async () => {
      if (document.hidden) return;
      try {
        const d = toDollars(await ausdBalance(address));
        if (!live) return;
        const prev = last.current;
        if (prev && prev.of === address && d > prev.dollars + 0.0001) {
          setArrivals((list) => [{ id: Date.now(), dollars: Math.round((d - prev.dollars) * 100) / 100, at: Date.now() }, ...list].slice(0, 6));
        }
        last.current = { of: address, dollars: d };
        setBalance({ of: address, dollars: d });
      } catch {}
    };
    read();
    const id = setInterval(read, POLL_MS);
    return () => { live = false; clearInterval(id); };
  }, [address]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);

  const mine = balance && balance.of === address ? balance.dollars : null;
  const latest = arrivals[0] && now - arrivals[0].at < 8000 ? arrivals[0] : null;
  const copy = async () => {
    if (!address) return;
    try { await navigator.clipboard.writeText(address); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const fade = { initial: { opacity: 0, y: reduce ? 0 : 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: reduce ? 0 : -8 }, transition: { duration: reduce ? 0 : 0.28, ease: EASE } };

  return (
    <div className="pay">
      <AnimatePresence mode="wait" initial={false}>
        {!address ? (
          <motion.div key="out" className="pay-card e-card" {...fade}>
            <span className="m-eyebrow">Employee Dashboard</span>
            <h1 className="m-title"><Kinetic text="Your tips" /></h1>
            <p className="m-sub">Sign in with the email your manager added. Your wallet is already set up, so there&apos;s nothing to install.</p>
            <ol className="e-how">
              <li><span className="e-how-icon" aria-hidden><HandCoins size={16} /></span><span>Customers tip you or the whole team</span></li>
              <li><span className="e-how-icon" aria-hidden><Wallet size={16} /></span><span>It lands in your wallet. Nothing to claim</span></li>
              <li><span className="e-how-icon" aria-hidden><Sparkles size={16} /></span><span>You see it here the moment it arrives</span></li>
            </ol>
            <button type="button" className="pay-send" onClick={requestConnect}>
              <span className="pay-send-label"><span>Sign in with email</span></span>
            </button>
          </motion.div>
        ) : (
          <motion.div key="in" className={`pay-card e-card${latest ? " is-celebrating" : ""}`} {...fade}>
            <div className="e-who">
              <span className="acct-dot" aria-hidden />
              <span className="e-who-text">Signed in as <b>{wallet.via && wallet.via.includes("@") ? wallet.via : short(address)}</b></span>
            </div>

            <section className="e-balance" aria-live="polite">
              <span className="e-balance-label">Your tips</span>
              <span className={`e-balance-value${mine !== null && usd(mine).length > 12 ? " is-s" : mine !== null && usd(mine).length > 9 ? " is-m" : ""}`}>
                {mine === null ? <span className="balance-skeleton e-skeleton" aria-label="Loading your tips" /> : <Roll value={usd(mine)} />}
              </span>
              <AnimatePresence>
                {latest && (
                  <motion.span key={latest.id} className="e-arrived" initial={{ opacity: 0, y: reduce ? 0 : 8, scale: reduce ? 1 : 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}>
                    +{usd(latest.dollars)} just arrived
                  </motion.span>
                )}
              </AnimatePresence>
              <span className="e-balance-sub"><span className="pay-live" aria-hidden />Live · paid straight to your wallet, nothing to claim</span>
            </section>

            <section className="e-feed" aria-labelledby="e-feed">
              <h2 id="e-feed" className="e-feed-title">Just arrived</h2>
              {arrivals.length === 0 ? (
                <p className="e-empty">New tips appear here the moment they land.</p>
              ) : (
                <ul>
                  <AnimatePresence initial={false}>
                    {arrivals.map((a) => (
                      <motion.li key={a.id} layout={!reduce} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}>
                        <span className="e-feed-icon" aria-hidden><HandCoins size={14} /></span>
                        <span className="e-feed-what">Tip</span>
                        <span className="e-feed-when">{ago(a.at, now)}</span>
                        <span className="e-feed-amount">+{usd(a.dollars)}</span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </section>

            <div className="e-actions">
              <button type="button" className="btn-secondary" onClick={copy}>
                {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} {copied ? "Copied" : "Copy wallet address"}
              </button>
              <a className="btn-secondary" href={`${EXPLORER}/address/${address}`} target="_blank" rel="noreferrer">
                All tips <ArrowUpRight size={16} aria-hidden />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Roll({ value }: { value: string }) {
  const reduce = useReducedMotion();
  return (
    <span className="roll">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ y: reduce ? 0 : "50%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: reduce ? 0 : "-50%", opacity: 0 }} transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}>
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
