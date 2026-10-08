"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { requestConnect, useWallet } from "../wallet-bridge";
import { EXPLORER } from "../chain";
import QrLink from "../QrLink";
import { NAME_KEY, fromLabel, useReceived } from "../received";

/**
 * Employee space: sign in with the email the manager added (the wallet was created for
 * them already), then see tips in dollars, live. Payouts are pushed to the wallet, so there is nothing
 * to claim; new arrivals are celebrated the moment the balance moves.
 */
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
  // The same Monad reading as My money: balance, and every payment in (amount, sender, time, receipt).
  const { dollars: mine, list: arrivals, latest } = useReceived(address);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [me, setMe] = useState(() => { try { return typeof window === "undefined" ? "" : localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; } });
  const saveMe = (v: string) => { setMe(v); try { localStorage.setItem(NAME_KEY, v); } catch {} };
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);

  const copy = async () => {
    if (!address) return;
    try { await navigator.clipboard.writeText(address); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const fade = { initial: { opacity: 0, y: reduce ? 0 : 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: reduce ? 0 : -8 }, transition: { duration: reduce ? 0 : 0.28, ease: EASE } };

  const amount = mine === null ? null : mine.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const size = amount && amount.length > 11 ? "s" : amount && amount.length > 8 ? "m" : "l";

  return (
    <div className="pay">
      <AnimatePresence mode="wait" initial={false}>
        {!address ? (
          <motion.div key="out" className="pay-card e-card" {...fade}>
            {/* A real moment, not an explainer: someone at work, a tip landing. */}
            <div className="e-photo">
              <Image src="/hero/bartender.jpg" alt="" fill sizes="(min-width: 600px) 400px, 100vw" priority />
              <span className="e-photo-chip" aria-hidden><span className="pay-live" /><Arrivals /><span className="e-photo-when">just now</span></span>
            </div>
            <h1 className="e-title">Your tips</h1>
            <p className="e-line">Sign in with the email your manager added. Your wallet is already there.</p>
            <button type="button" className="pay-send" onClick={requestConnect}>
              <span className="pay-send-label"><span>Sign in with email</span></span>
            </button>
          </motion.div>
        ) : (
          <motion.div key="in" className={`pay-card e-card${latest ? " is-celebrating" : ""}`} {...fade}>
            <header className="pay-to">
              <span className="pay-faces" aria-hidden><span className="pay-face"><Image src="/hero/bartender.jpg" alt="" fill sizes="32px" priority /></span></span>
              <span className="pay-to-text">
                <span className="pay-to-name">Your tips</span>
                <span className="pay-status"><span className="pay-live" aria-hidden />{wallet.via && wallet.via.includes("@") ? wallet.via : short(address)}</span>
              </span>
              <button type="button" className="pay-details-btn" onClick={copy}>{copied ? "Copied" : "Copy address"}</button>
            </header>

            <div className={`pay-amount pay-amount-${size} e-amount`} aria-live="polite" aria-label={amount ? `Your tips: $${amount}` : "Loading your tips"}>
              <span className="pay-currency" aria-hidden>$</span>
              {amount === null ? <span className="balance-skeleton e-skeleton" /> : <Roll value={amount} />}
            </div>
            <div className="e-under">
              <AnimatePresence mode="wait" initial={false}>
                {latest ? (
                  <motion.span key={latest.hash} className="e-arrived" initial={{ opacity: 0, y: reduce ? 0 : 6, scale: reduce ? 1 : 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}>
                    +{usd(latest.cents / 100)} from {fromLabel(latest.from)}
                  </motion.span>
                ) : (
                  <motion.span key="calm" className="e-calm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    Paid straight to your wallet
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {arrivals.length > 0 && (
              <ul className="e-feed" aria-label="Tips that just arrived">
                <AnimatePresence initial={false}>
                  {arrivals.slice(0, 6).map((a) => (
                    <motion.li key={a.hash + a.from} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}>
                      <a className="e-feed-amount" href={`${EXPLORER}/tx/${a.hash}`} target="_blank" rel="noreferrer">+{usd(a.cents / 100)}</a>
                      <span className="e-feed-when">from {fromLabel(a.from)} · {ago(a.at, now)}</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}

            <QrLink path={`/send?to=${address}${me.trim() ? `&name=${encodeURIComponent(me.trim())}` : ""}`} name={me.trim() || "me"} label="Get tipped directly with your link">
              <label className="q-name">
                <span>Name on it</span>
                <input value={me} maxLength={40} placeholder="Your name" onChange={(e) => saveMe(e.target.value)} />
              </label>
            </QrLink>

            <a className="e-all" href={`${EXPLORER}/address/${address}`} target="_blank" rel="noreferrer">See every tip on Monad <ArrowUpRight size={14} aria-hidden /></a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The signed-out photo's chip: a tip lands every few seconds. */
const SAMPLE = ["4.50", "12.00", "3.25", "8.00", "6.00"];
function Arrivals() {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) setN((x) => (x + 1) % SAMPLE.length); }, 2800);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="e-photo-amount">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.b key={n} initial={{ y: reduce ? 0 : "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: reduce ? 0 : "-100%", opacity: 0 }} transition={{ duration: reduce ? 0 : 0.32, ease: EASE }}>
          +${SAMPLE[n]}
        </motion.b>
      </AnimatePresence>
    </span>
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
