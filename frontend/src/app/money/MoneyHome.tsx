"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { requestConnect, useWallet } from "../wallet-bridge";
import { EXPLORER } from "../chain";
import { NAME_KEY, fromLabel, useReceived } from "../received";
import QrLink from "../QrLink";

/**
 * My money (the individual's twin of the Employee Dashboard): sign in with email, see your balance, and every
 * payment as it arrives: how much, from whom, when, with its receipt. Your own link and QR code let anyone pay
 * you straight from Send. Payments land in the wallet directly, so there is nothing to claim.
 * Arrivals are read from Monad while the page is open and remembered on this device; the full record is on
 * the explorer (the public network only searches recent blocks).
 */
const EASE = [0.2, 0.8, 0.2, 1] as const;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ago = (t: number, now: number) => {
  const s = Math.max(0, Math.round((now - t) / 1000));
  return s < 45 ? "just now" : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function MoneyHome() {
  const reduce = useReducedMotion();
  const wallet = useWallet();
  const address = wallet.address;
  const { dollars: mine, list, latest } = useReceived(address);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [me, setMe] = useState(() => { try { return typeof window === "undefined" ? "" : localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; } });
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);

  const saveMe = (v: string) => { setMe(v); try { localStorage.setItem(NAME_KEY, v); } catch {} };
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
            <div className="e-photo">
              <Image src="/hero/bartender.jpg" alt="" fill sizes="(min-width: 600px) 400px, 100vw" priority />
              <span className="e-photo-chip" aria-hidden><span className="pay-live" /><b className="i-chip-amount">+$25.00</b><span className="e-photo-when">from Sam · just now</span></span>
            </div>
            <h1 className="e-title">My money</h1>
            <p className="e-line">Sign in with your email to see what&apos;s been sent to you, from whom, and when. If someone paid your email, it&apos;s already waiting.</p>
            <button type="button" className="pay-send" onClick={requestConnect}>
              <span className="pay-send-label"><span>Sign in with email</span></span>
            </button>
          </motion.div>
        ) : (
          <motion.div key="in" className="pay-card e-card" {...fade}>
            <header className="pay-to">
              <span className="pay-faces" aria-hidden><span className="pay-face"><Image src="/hero/bartender.jpg" alt="" fill sizes="32px" priority /></span></span>
              <span className="pay-to-text">
                <span className="pay-to-name">My money</span>
                <span className="pay-status"><span className="pay-live" aria-hidden />{wallet.via && wallet.via.includes("@") ? wallet.via : short(address)}</span>
              </span>
              <button type="button" className="pay-details-btn" onClick={copy}>{copied ? "Copied" : "Copy address"}</button>
            </header>

            <div className={`pay-amount pay-amount-${size} e-amount`} aria-live="polite" aria-label={amount ? `Your balance: $${amount}` : "Loading your balance"}>
              <span className="pay-currency" aria-hidden>$</span>
              {amount === null ? <span className="balance-skeleton e-skeleton" /> : <Roll value={amount} />}
            </div>
            <div className="e-under">
              <AnimatePresence mode="wait" initial={false}>
                {latest ? (
                  <motion.span key={latest.hash} className="e-arrived" initial={{ opacity: 0, y: reduce ? 0 : 6, scale: reduce ? 1 : 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}>
                    +{money(latest.cents)} from {fromLabel(latest.from)}
                  </motion.span>
                ) : (
                  <motion.span key="calm" className="e-calm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>In your wallet. Nothing to claim.</motion.span>
                )}
              </AnimatePresence>
            </div>

            <section aria-label="Received">
              <p className="i-section">Received</p>
              {list.length ? (
                <ul className="i-received">
                  <AnimatePresence initial={false}>
                    {list.slice(0, 12).map((r) => (
                      <motion.li key={r.hash + r.from} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}>
                        <span className="i-received-from">From <a href={`${EXPLORER}/address/${r.from}`} target="_blank" rel="noreferrer">{fromLabel(r.from)}</a></span>
                        <span className="i-received-when">{ago(r.at, now)}</span>
                        <a className="i-received-amount" href={`${EXPLORER}/tx/${r.hash}`} target="_blank" rel="noreferrer" aria-label={`${money(r.cents)} received, receipt`}>+{money(r.cents)}</a>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              ) : (
                <p className="i-empty">Nothing yet. New payments appear here.</p>
              )}
            </section>

            <QrLink path={`/send?to=${address}${me.trim() ? `&name=${encodeURIComponent(me.trim())}` : ""}`} name={me.trim() || "me"} label="Get paid with your link">
              <label className="q-name">
                <span>Name on it</span>
                <input value={me} maxLength={40} placeholder="Your name" onChange={(e) => saveMe(e.target.value)} />
              </label>
            </QrLink>

            <a className="e-all" href={`${EXPLORER}/address/${address}`} target="_blank" rel="noreferrer">Everything, on Monad <ArrowUpRight size={14} aria-hidden /></a>
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
