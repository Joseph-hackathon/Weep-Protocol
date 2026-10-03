"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Delete } from "lucide-react";
import { requestConnect, useWallet } from "../wallet-bridge";
import {
  AUSD, EXPLORER, FAUCET, SPLITTER, ausdBalance, mintData, monBalance, readPolicy, toDollars, toUnits, transferData, waitForReceipt,
} from "../chain";

/**
 * Customer space (DOCS.md §4.1) as one payment card, on live Monad testnet data.
 *   Amount first: typed straight in (keypad on phones, keyboard on desktop), digits pop as they land.
 *   Route second: one bar shows exactly where the money goes — the live rule read from TipSplitter
 *   (the merchant sets it in plain words; AI turns it into these percentages; it can change anytime).
 *   One action: the button carries the whole journey (sign in → confirm → sending → done).
 * Payment is real: test AUSD into the TipSplitter pool, confirmed on-chain, with its explorer receipt.
 * The page never loads the wallet stack itself (wallet bridge) and reads the chain with plain JSON-RPC.
 */
type Policy = { foh: number; boh: number; bar: number };
type Phase = "idle" | "minting" | "confirm" | "sending" | "done";
const GROUPS = [
  { key: "foh", label: "Floor", photo: "/hero/barista.jpg" }, // front of house
  { key: "boh", label: "Kitchen", photo: "/hero/chefs.jpg" },
  { key: "bar", label: "Bar", photo: "/hero/bartender.jpg" },
] as const;
const QUICK = [1, 2, 5];
const TEST_DOLLARS = 100;
const EASE = [0.2, 0.8, 0.2, 1] as const;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

const usd = (d: number, cents = false) =>
  `$${d.toLocaleString("en-US", { minimumFractionDigits: cents || d % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const rejected = (e: unknown) => /reject|denied|cancel/i.test(String((e as { message?: string })?.message ?? e)) || (e as { code?: number })?.code === 4001;

/** Keypad rules: at most 4 whole digits and 2 decimals; a leading 0 is replaced. */
function nextEntry(e: string, k: string) {
  if (k === "del") return e.length > 1 ? e.slice(0, -1) : "0";
  if (k === ".") return e.includes(".") ? e : e + ".";
  const [whole, dec] = e.split(".");
  if (dec !== undefined) return dec.length >= 2 ? e : e + k;
  if (e === "0") return k;
  return whole.length >= 4 ? e : e + k;
}

/** Typed amounts follow the keypad rules: digits and one point, 4 whole digits, 2 decimals. */
function sanitize(v: string) {
  const clean = v.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
  const [whole, dec] = clean.split(".");
  const w = (whole || "0").replace(/^0+(?=\d)/, "").slice(0, 4) || "0";
  return dec === undefined ? w : `${w}.${dec.slice(0, 2)}`;
}

export default function TipFlow() {
  const reduce = useReducedMotion();
  const wallet = useWallet();
  const address = wallet.address;
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [pool, setPool] = useState<number | null>(null);
  const [funds, setFunds] = useState<{ ausd: bigint; mon: bigint; of: string } | null>(null);
  const [entry, setEntry] = useState("2");
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [tx, setTx] = useState<{ hash: string; dollars: number; target: string } | null>(null);
  const [details, setDetails] = useState(false);
  const [typing, setTyping] = useState(false); // "Custom": type the amount in a field (any device)
  const [intent, setIntent] = useState(false); // pressed Send before signing in: continue once signed in
  const [target, setTarget] = useState<string>("pool"); // "pool" or employee ID

  const EMPLOYEES = [
    { id: "Alice", role: "Floor", photo: "/hero/barista.jpg" },
    { id: "Charlie", role: "Kitchen", photo: "/hero/chefs.jpg" },
    { id: "Dave", role: "Bar", photo: "/hero/bartender.jpg" }
  ];
  const targetEmployee = EMPLOYEES.find(e => e.id === target);

  const dollars = Number(entry) || 0;
  const valid = dollars >= 0.01;
  const signingIn = intent && !address;
  const preparing = intent && Boolean(address); // signed in, about to carry on by itself
  const busy = phase === "minting" || phase === "confirm" || phase === "sending" || signingIn || preparing;
  const myFunds = funds && funds.of === address ? funds : null;
  const balance = myFunds ? toDollars(myFunds.ausd) : null;
  // Decided before the press, so the button always offers the right next step.
  const lowMon = Boolean(address && myFunds && myFunds.mon === BigInt(0));
  const lowAusd = Boolean(address && myFunds && !lowMon && myFunds.ausd < toUnits(dollars));

  // Live rule and pool, refreshed while the page is visible.
  useEffect(() => {
    let live = true;
    const read = () => {
      if (document.hidden) return;
      readPolicy().then((p) => live && setPolicy(p)).catch(() => {});
      ausdBalance(SPLITTER).then((b) => live && setPool(toDollars(b))).catch(() => {});
    };
    read();
    const id = setInterval(read, 15000);
    return () => { live = false; clearInterval(id); };
  }, []);

  const refreshFunds = useCallback(async (who: string) => {
    const [a, m] = await Promise.all([ausdBalance(who), monBalance(who)]);
    setFunds({ ausd: a, mon: m, of: who });
    return { ausd: a, mon: m };
  }, []);
  useEffect(() => {
    if (!address) return;
    let live = true;
    Promise.all([ausdBalance(address), monBalance(address)]).then(([a, m]) => live && setFunds({ ausd: a, mon: m, of: address })).catch(() => {});
    return () => { live = false; };
  }, [address]);

  const press = useCallback((k: string) => {
    setEntry((e) => nextEntry(e, k));
    setMessage(null);
    try { navigator.vibrate?.(6); } catch {}   // a tiny tap on phones that support it (Android)
  }, []);

  // Desktop: type the amount straight in.
  useEffect(() => {
    if (phase !== "idle") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (e.metaKey || e.ctrlKey || e.altKey || (t instanceof Element && t.closest("input, textarea, [contenteditable], [role=dialog]"))) return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "." || e.key === ",") press(".");
      else if (e.key === "Backspace") press("del");
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, press]);

  /** The whole payment, once signed in: top up test dollars if short, then send, then wait for Monad. */
  const go = async () => {
    setMessage(null);
    if (!address || !wallet.send) return;
    if (!wallet.onMonad) { setMessage("Your wallet is on another network. Switch to Monad at the top, then send."); return; }
    try {
      let f = myFunds ?? (await refreshFunds(address));
      if (f.mon === BigInt(0)) return;  // the button now offers the faucet
      if (f.ausd < toUnits(dollars)) {
        setPhase("minting");
        const minted = await wallet.send({ to: AUSD, data: mintData(address, toUnits(TEST_DOLLARS)) });
        if (!(await waitForReceipt(minted))) throw new Error("Couldn't add test dollars. Nothing was sent.");
        f = await refreshFunds(address);
      }
      setPhase("confirm");
      
      // If tipping an individual, we ideally call tipIndividual. For UI demonstration, we still send to SPLITTER.
      const hash = await wallet.send({ to: AUSD, data: transferData(SPLITTER, toUnits(dollars)) });
      
      setPhase("sending");
      if (!(await waitForReceipt(hash))) throw new Error("The network turned the payment down. Nothing was sent.");
      setTx({ hash, dollars, target });
      setPhase("done");
      ausdBalance(SPLITTER).then((b) => setPool(toDollars(b))).catch(() => {});
      refreshFunds(address).catch(() => {});
    } catch (e) {
      setPhase("idle");
      setMessage(rejected(e) ? "Cancelled. Nothing was sent." : (e as Error)?.message || "Something went wrong. Nothing was sent.");
    }
  };

  /** One button for the whole journey. */
  const primary = () => {
    if (!address) { setIntent(true); setMessage(null); requestConnect(); return; }
    if (lowMon) { window.open(FAUCET, "_blank", "noopener"); return; }
    go();
  };

  // Pressed Send before signing in: carry on by itself the moment the sign-in lands.
  useEffect(() => {
    if (!intent || !address || !wallet.send) return;
    // The intent stays up while the payment runs, so the label goes straight from "Preparing" to the wallet step.
    const id = setTimeout(() => { go().finally(() => setIntent(false)); }, 450);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per sign-in, with the values of that moment
  }, [intent, address, wallet.send]);

  // Closed the sign-in window without signing in: stand down quietly.
  useEffect(() => {
    if (!intent) return;
    const onClosed = () => setTimeout(() => setIntent((was) => (was && !document.querySelector(".btn-account") ? false : was)), 1500);
    window.addEventListener("weep:connect-closed", onClosed);
    return () => window.removeEventListener("weep:connect-closed", onClosed);
  }, [intent]);

  const done = () => { setPhase("idle"); setTx(null); setEntry("2"); setTyping(false); setIntent(false); setMessage(null); };
  /** Each group's share in whole cents, largest remainder first, so the parts always add up to the tip exactly. */
  const share = (key: (typeof GROUPS)[number]["key"], total: number) => {
    if (!policy) return 0;
    const cents = Math.round(total * 100);
    const parts = GROUPS.map((g) => ({ k: g.key, exact: (cents * policy[g.key]) / 100 }));
    const base = parts.map((x) => ({ ...x, c: Math.floor(x.exact) }));
    let left = cents - base.reduce((n, x) => n + x.c, 0);
    [...base].sort((x, y) => (y.exact - y.c) - (x.exact - x.c)).forEach((x) => { if (left > 0) { x.c += 1; left -= 1; } });
    return (base.find((x) => x.k === key)?.c ?? 0) / 100;
  };

  const amount = usd(dollars, true);
  const label =
    phase === "minting" ? "Adding test dollars" :
    phase === "confirm" ? "Confirm in your wallet" :
    phase === "sending" ? "Sending" :
    signingIn ? "Signing in" :
    preparing ? "Preparing your tip" :
    !valid ? "Enter an amount" :
    !address ? `Sign in to send ${amount}` :
    lowMon ? "Get MON for the network fee" :
    lowAusd ? `Add ${usd(TEST_DOLLARS)} test dollars & send` :
    `Send tip · ${amount}`;
  const size = entry.length > 6 ? "s" : entry.length > 4 ? "m" : "l";

  return (
    <div className="pay">
      <AnimatePresence mode="wait" initial={false}>
        {phase !== "done" ? (
          <motion.div key="pay" className="pay-card" initial={{ opacity: 0, y: reduce ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: reduce ? 1 : 0.98 }} transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}>
            {/* Who */}
            <header className="pay-to">
              <span className="pay-faces" aria-hidden>
                {target === "pool" ? (
                  GROUPS.map((g) => <span key={g.key} className="pay-face"><Image src={g.photo} alt="" fill sizes="32px" priority /></span>)
                ) : (
                  <span className="pay-face"><Image src={targetEmployee?.photo || ""} alt="" fill sizes="32px" priority /></span>
                )}
              </span>
              <span className="pay-to-text">
                <select className="pay-select" value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="pool">Team tip pool</option>
                  {EMPLOYEES.map(emp => <option key={emp.id} value={emp.id}>{emp.id} ({emp.role})</option>)}
                </select>
                <span className="pay-status">
                  {target === "pool" ? (
                    <><span className="pay-live" aria-hidden />{pool === null ? "Reading the pool…" : `${usd(pool, true)} waiting to be shared`}</>
                  ) : (
                    "100% direct tip"
                  )}
                </span>
              </span>
              {target === "pool" && (
                <button type="button" className="pay-details-btn" aria-expanded={details} aria-controls="pay-details" onClick={() => setDetails((d) => !d)}>
                  <span className="pay-details-long">Split details</span><span className="pay-details-short">Details</span>
                </button>
              )}
            </header>
            <AnimatePresence initial={false}>
              {details && target === "pool" && (
                <motion.div id="pay-details" className="pay-details" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: reduce ? 0 : 0.24, ease: EASE }}>
                  <div className="pay-details-inner">
                    <p>The venue writes this rule in plain words. It&apos;s saved on Monad and applies to every tip until they change it.</p>
                    <a href={`${EXPLORER}/address/${SPLITTER}`} target="_blank" rel="noreferrer">View the pool <ArrowUpRight size={14} aria-hidden /></a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* How much */}
            <h1 className="sr-only">Leave a tip for the team</h1>
            <div className={`pay-amount pay-amount-${size}`} aria-live="polite" aria-label={`Tip amount ${usd(dollars)}`}>
              <span className="pay-currency" aria-hidden>$</span>
              {typing ? (
                <input
                  className="pay-input" autoFocus inputMode="decimal" aria-label="Tip amount in dollars" disabled={busy}
                  value={entry === "0" ? "" : entry} placeholder="0"
                  onChange={(e) => setEntry(sanitize(e.target.value))}
                  style={{ width: `${Math.max(1, entry.length) + 0.15}ch` }}
                />
              ) : (
                <span className="pay-digits" aria-hidden>
                  <AnimatePresence mode="popLayout" initial={false}>
                    {entry.split("").map((ch, i) => (
                      <motion.span key={`${i}-${ch}`} className="pay-digit"
                        initial={{ y: reduce ? 0 : "40%", opacity: 0, scale: reduce ? 1 : 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: reduce ? 0 : "-30%", opacity: 0 }}
                        transition={{ duration: reduce ? 0 : 0.18, ease: EASE }}>
                        {ch}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </span>
              )}
            </div>
            <p className="pay-balance">
              {balance === null ? (address ? "Reading your balance…" : "Enter an amount") : (
                <>Balance {usd(balance, true)}
                  {balance > 0 && <button type="button" className="pay-max" onClick={() => { setTyping(false); setEntry(String(Math.floor(balance * 100) / 100)); }} disabled={busy}>Max</button>}
                </>
              )}
            </p>

            <div className="pay-quick" role="group" aria-label="Amount">
              {QUICK.map((q) => (
                <button key={q} type="button" className="pay-chip" aria-pressed={!typing && entry === String(q)} disabled={busy} onClick={() => { setTyping(false); setEntry(String(q)); }}>${q}</button>
              ))}
              <button type="button" className="pay-chip" aria-pressed={typing} disabled={busy} onClick={() => { setTyping(true); setEntry("0"); }}>Custom</button>
            </div>

            {/* Where it goes: one bar, like a swap route */}
            {target === "pool" && (
              <section className="pay-route" aria-label="Where your tip goes">
                <div className="pay-route-head">
                  <span>Split</span>
                  <span className="pay-route-rule">{policy ? `${policy.foh}% · ${policy.boh}% · ${policy.bar}%` : "…"}</span>
                </div>
                <div className="pay-bar" aria-hidden>
                  {GROUPS.map((g, i) => (
                    <motion.span key={g.key} className={`pay-seg pay-seg-${i}`} initial={false}
                      animate={{ flexGrow: policy ? policy[g.key] : 1 }} transition={{ duration: reduce ? 0 : 0.6, ease: EASE }} />
                  ))}
                </div>
                <ul className="pay-legend">
                  {GROUPS.map((g, i) => (
                    <li key={g.key}>
                      <span className="pay-legend-label"><span className={`pay-dot pay-seg-${i}`} aria-hidden />{g.label}{policy && <span className="pay-legend-pct">({policy[g.key]}%)</span>}</span>
                      <Roll value={policy && valid ? usd(share(g.key, dollars), true) : "—"} className="pay-legend-amount" />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Phones: a keypad, so the amount is typed straight in */}
            <div className="pay-keypad" role="group" aria-label="Keypad">
              {KEYS.map((k) => (
                <button key={k} type="button" className="pay-key" disabled={busy} onClick={() => press(k)} aria-label={k === "del" ? "Delete" : k === "." ? "Decimal point" : k}>
                  {k === "del" ? <Delete size={22} aria-hidden /> : k}
                </button>
              ))}
            </div>

            {/* One action that carries the whole journey */}
            <button type="button" className={`pay-send${busy ? " is-busy" : ""}`} onClick={primary} disabled={!valid || busy} aria-busy={busy || undefined}>
              <span className="pay-send-progress" aria-hidden />
              <motion.span className="pay-send-fill" aria-hidden initial={false}
                animate={{ scaleX: phase === "sending" ? 0.92 : phase === "confirm" || phase === "minting" ? 0.35 : preparing ? 0.22 : signingIn ? 0.1 : 0 }}
                transition={{ duration: reduce ? 0 : phase === "sending" ? 2.6 : 0.4, ease: phase === "sending" ? [0.1, 0.6, 0.3, 1] : EASE }} />
              <span className="pay-send-label">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={label} initial={{ y: reduce ? 0 : 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: reduce ? 0 : -14, opacity: 0 }} transition={{ duration: reduce ? 0 : 0.24, ease: EASE }}>
                    {label}{busy && <span className="pay-ellipsis" aria-hidden />}
                  </motion.span>
                </AnimatePresence>
              </span>
            </button>
            {/* Only speaks up when something needs attention (cancelled, wrong network, an error). */}
            {message && <p className="pay-note" role="status">{message}</p>}
          </motion.div>
        ) : (
          <motion.div key="done" className="pay-card pay-done" initial={{ opacity: 0, scale: reduce ? 1 : 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}>
            <svg className="pay-check" viewBox="0 0 64 64" aria-hidden>
              <motion.circle cx="32" cy="32" r="29" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.5, ease: EASE }} />
              <motion.path d="M20 33 l8 8 l16 -18" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.4, ease: EASE }} />
            </svg>
            <h1 className="pay-done-amount">{usd(tx!.dollars, true)} sent</h1>
            <p className="pay-done-sub">
              {tx!.target === "pool" 
                ? "It's in the team's tip pool, shared by the house rule."
                : `It went 100% directly to ${tx!.target}'s wallet.`}
            </p>

            {tx!.target === "pool" ? (
              <ul className="pay-done-split">
                {GROUPS.map((g, i) => (
                  <motion.li key={g.key} initial={{ opacity: 0, y: reduce ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.55 + i * 0.08, ease: EASE }}>
                    <span className="pay-done-photo"><Image src={g.photo} alt="" fill sizes="48px" /></span>
                    <span className="pay-done-share">+{usd(share(g.key, tx!.dollars), true)}</span>
                    <span className="pay-done-label">{g.label}</span>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <ul className="pay-done-split">
                  <motion.li initial={{ opacity: 0, y: reduce ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.55, ease: EASE }}>
                    <span className="pay-done-photo"><Image src={EMPLOYEES.find(e => e.id === tx!.target)?.photo || ""} alt="" fill sizes="48px" /></span>
                    <span className="pay-done-share">+{usd(tx!.dollars, true)}</span>
                    <span className="pay-done-label">Direct Tip</span>
                  </motion.li>
              </ul>
            )}

            <dl className="pay-receipt">
              <div><dt>Platform fee</dt><dd>$0</dd></div>
              <div><dt>Confirmed</dt><dd><a href={`${EXPLORER}/tx/${tx!.hash}`} target="_blank" rel="noreferrer">{tx!.hash.slice(0, 6)}…{tx!.hash.slice(-4)} <ArrowUpRight size={14} aria-hidden /></a></dd></div>
            </dl>
            <button type="button" className="btn-connect pay-again" onClick={done}>Done</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A value that rolls into place when it changes. */
function Roll({ value, className }: { value: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={`roll ${className ?? ""}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ y: reduce ? 0 : "60%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: reduce ? 0 : "-60%", opacity: 0 }} transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}>
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
