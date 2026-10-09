"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Delete } from "lucide-react";
import { requestConnect, useWallet } from "../wallet-bridge";
import {
  AUSD, EXPLORER, FAUCET, approveData, ausdAllowance, ausdBalance, mintData, monBalance, readPolicy, readTeam, supportsTeam,
  tipIndividualData, toDollars, toUnits, transferData, waitForReceipt, type Member,
} from "../chain";
import { ensureGas } from "../gas";
import { resolvePool } from "../pool-link";

/**
 * Customer space as one payment card, on live Monad testnet data.
 *   Amount first: typed straight in (keypad on phones, keyboard on desktop), digits pop as they land.
 *   Route second: one bar shows exactly where the money goes — the live rule read from the business's own pool
 *   (the code or link says which pool; the business sets the rule in plain words; it can change anytime).
 *   One action: the button carries the whole journey (sign in → confirm → sending → done).
 * Payment is real: test AUSD into the pool (or straight to one person), confirmed on-chain, with its receipt.
 * The page never loads the wallet stack itself (wallet bridge) and reads the chain with plain JSON-RPC.
 */
type Policy = { foh: number; boh: number; bar: number };
type Phase = "idle" | "gas" | "minting" | "approve" | "confirm" | "sending" | "done";
const GROUPS = [
  { key: "foh", label: "Floor", photo: "/hero/barista.jpg" }, // front of house
  { key: "boh", label: "Kitchen", photo: "/hero/chefs.jpg" },
  { key: "bar", label: "Bar", photo: "/hero/bartender.jpg" },
] as const;
const PHOTO = [GROUPS[0].photo, GROUPS[1].photo, GROUPS[2].photo]; // a person's face follows their group
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
  const [poolAt, setPoolAt] = useState<string | null>(null); // the business's pool, from the code or link
  const [badLink, setBadLink] = useState(false);
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
  // Tip the team, or one person by name. People are read from the pool on Monad (saved by the venue on the
  // Merchant page); a pool without a saved team only offers the team, so a tip never goes somewhere unsaid.
  const [team, setTeam] = useState<Member[]>([]);
  const [picked, setPicked] = useState<string>("pool"); // "pool" or a person's name
  const person = team.find((m) => m.name === picked) ?? null;
  const target = person ? person.name : "pool";

  const dollars = Number(entry) || 0;
  const valid = dollars >= 0.01;
  const signingIn = intent && !address;
  const preparing = intent && Boolean(address); // signed in, about to carry on by itself
  const busy = phase === "gas" || phase === "minting" || phase === "approve" || phase === "confirm" || phase === "sending" || signingIn || preparing;
  const myFunds = funds && funds.of === address ? funds : null;
  const balance = myFunds ? toDollars(myFunds.ausd) : null;
  // Decided before the press, so the button always offers the right next step.
  // Email sign-ins have their first fee covered by Weep, so only other wallets are sent to the faucet.
  const lowMon = Boolean(address && myFunds && myFunds.mon === BigInt(0) && !wallet.token);
  const lowAusd = Boolean(address && myFunds && !lowMon && myFunds.ausd < toUnits(dollars));

  // Which business: the pool in the code or link (checked on Monad), else the last one used here.
  useEffect(() => {
    let live = true;
    resolvePool().then((p) => { if (!live) return; if (p) setPoolAt(p); else setBadLink(true); }).catch(() => live && setBadLink(true));
    return () => { live = false; };
  }, []);

  // Live rule and pool, refreshed while the page is visible.
  useEffect(() => {
    if (!poolAt) return;
    let live = true;
    let hasTeam = false;
    const read = () => {
      if (document.hidden) return;
      readPolicy(poolAt).then((p) => live && setPolicy(p)).catch(() => {});
      ausdBalance(poolAt).then((b) => live && setPool(toDollars(b))).catch(() => {});
      if (hasTeam) readTeam(poolAt).then((t) => live && setTeam(t)).catch(() => {});
    };
    supportsTeam(poolAt).then((ok) => { hasTeam = ok; if (ok) readTeam(poolAt).then((t) => live && setTeam(t)).catch(() => {}); }).catch(() => {});
    read();
    const id = setInterval(read, 15000);
    document.addEventListener("visibilitychange", read); // opened in the background (a scanned code): read as soon as it's seen
    return () => { live = false; clearInterval(id); document.removeEventListener("visibilitychange", read); };
  }, [poolAt]);

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

  // Every key answers the press the same way on every device: a short mint flash on the key (also when
  // the matching key is typed on a physical keyboard) and, on phones that allow it, a tiny vibration.
  const [pressed, setPressed] = useState<{ key: string; n: number } | null>(null);
  const press = useCallback((k: string) => {
    setEntry((e) => nextEntry(e, k));
    setMessage(null);
    setPressed((p) => ({ key: k, n: (p?.n ?? 0) + 1 }));
    try { navigator.vibrate?.(6); } catch {}
  }, []);
  useEffect(() => {
    if (!pressed) return;
    const id = setTimeout(() => setPressed(null), 160);
    return () => clearTimeout(id);
  }, [pressed]);

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
    if (!address || !wallet.send || !poolAt) return;
    if (!wallet.onMonad) { setMessage("Your wallet is on another network. Switch to Monad at the top, then send."); return; }
    try {
      let f = myFunds ?? (await refreshFunds(address));
      if (f.mon === BigInt(0)) {
        setPhase("gas");
        if (!(await ensureGas(wallet))) { setPhase("idle"); window.open(FAUCET, "_blank", "noopener"); setMessage("This needs a little MON for the network fee. Get some free from the faucet, then send."); return; }
        f = await refreshFunds(address);
      }
      if (f.ausd < toUnits(dollars)) {
        setPhase("minting");
        const minted = await wallet.send({ to: AUSD, data: mintData(address, toUnits(TEST_DOLLARS)) });
        if (!(await waitForReceipt(minted))) throw new Error("Couldn't add test dollars. Nothing was sent.");
        f = await refreshFunds(address);
      }
      const units = toUnits(dollars);
      let hash: string;
      if (person) {
        // A direct tip: the pool may move exactly this amount from the customer straight to the person.
        if ((await ausdAllowance(address, poolAt)) < units) {
          setPhase("approve");
          const ok = await wallet.send({ to: AUSD, data: approveData(poolAt, units) });
          if (!(await waitForReceipt(ok))) throw new Error("Couldn't approve the tip. Nothing was sent.");
        }
        setPhase("confirm");
        hash = await wallet.send({ to: poolAt as `0x${string}`, data: tipIndividualData(person.name, units) });
      } else {
        setPhase("confirm");
        hash = await wallet.send({ to: AUSD, data: transferData(poolAt, units) });
      }
      setPhase("sending");
      if (!(await waitForReceipt(hash))) throw new Error("The network turned the payment down. Nothing was sent.");
      setTx({ hash, dollars, target });
      setPhase("done");
      ausdBalance(poolAt).then((b) => setPool(toDollars(b))).catch(() => {});
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
  // What each group really gets, as the pool pays it: a group with nobody on the team hands its share to the
  // groups that have people (the same rule as payoutTeam on Monad). Without a saved team, the rule as set.
  const split: Policy | null = (() => {
    if (!policy || team.length === 0) return policy;
    const staffed = { foh: team.some((m) => m.group === 0), boh: team.some((m) => m.group === 1), bar: team.some((m) => m.group === 2) };
    const active = GROUPS.reduce((n, g) => n + (staffed[g.key] ? policy[g.key] : 0), 0);
    if (!active) return policy;
    return { foh: staffed.foh ? (policy.foh * 100) / active : 0, boh: staffed.boh ? (policy.boh * 100) / active : 0, bar: staffed.bar ? (policy.bar * 100) / active : 0 };
  })();
  const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

  /** Each group's share in whole cents, largest remainder first, so the parts always add up to the tip exactly. */
  const share = (key: (typeof GROUPS)[number]["key"], total: number) => {
    if (!split) return 0;
    const cents = Math.round(total * 100);
    const parts = GROUPS.map((g) => ({ k: g.key, exact: (cents * split[g.key]) / 100 }));
    const base = parts.map((x) => ({ ...x, c: Math.floor(x.exact) }));
    let left = cents - base.reduce((n, x) => n + x.c, 0);
    [...base].sort((x, y) => (y.exact - y.c) - (x.exact - x.c)).forEach((x) => { if (left > 0) { x.c += 1; left -= 1; } });
    return (base.find((x) => x.k === key)?.c ?? 0) / 100;
  };

  const amount = usd(dollars, true);
  const label =
    badLink ? "This code isn't a Weep tip pool" :
    phase === "gas" ? "Covering the network fee" :
    phase === "minting" ? "Adding test dollars" :
    phase === "approve" ? "Allow the tip in your wallet" :
    phase === "confirm" ? "Confirm in your wallet" :
    phase === "sending" ? "Sending" :
    signingIn ? "Signing in" :
    preparing ? "Preparing your tip" :
    !valid ? "Enter an amount" :
    !address ? `Sign in to send ${amount}` :
    lowMon ? "Get MON for the network fee" :
    lowAusd ? `Add ${usd(TEST_DOLLARS)} test dollars & send` :
    person ? `Send ${amount} to ${person.name}` :
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
                {person ? (
                  <span className="pay-face"><Image src={PHOTO[person.group]} alt="" fill sizes="32px" priority /></span>
                ) : (
                  GROUPS.map((g) => <span key={g.key} className="pay-face"><Image src={g.photo} alt="" fill sizes="32px" priority /></span>)
                )}
              </span>
              <span className="pay-to-text">
                <span className="pay-to-name">{person ? person.name : "Team tip pool"}</span>
                <span className="pay-status">
                  <span className="pay-live" aria-hidden />
                  {person ? `${GROUPS[person.group].label} · gets all of it` : pool === null ? "Reading the pool…" : `${usd(pool, true)} waiting to be shared`}
                </span>
              </span>
              {!person && (
                <button type="button" className="pay-details-btn" aria-expanded={details} aria-controls="pay-details" onClick={() => setDetails((d) => !d)}>
                  <span className="pay-details-long">Split details</span><span className="pay-details-short">Details</span>
                </button>
              )}
            </header>
            {team.length > 0 && (
              <div className="pay-people" role="radiogroup" aria-label="Who the tip is for">
                <button type="button" role="radio" aria-checked={!person} className="pay-person" disabled={busy} onClick={(e) => { setPicked("pool"); e.currentTarget.scrollIntoView({ inline: "nearest", block: "nearest", behavior: reduce ? "auto" : "smooth" }); }}>Everyone</button>
                {team.map((m) => (
                  <button key={m.name} type="button" role="radio" aria-checked={person?.name === m.name} className="pay-person" disabled={busy} onClick={(e) => { setPicked(m.name); setDetails(false); e.currentTarget.scrollIntoView({ inline: "nearest", block: "nearest", behavior: reduce ? "auto" : "smooth" }); }}>
                    <span className="pay-person-face" aria-hidden><Image src={PHOTO[m.group]} alt="" fill sizes="26px" /></span>{m.name}
                  </button>
                ))}
              </div>
            )}
            <AnimatePresence initial={false}>
              {details && !person && (
                <motion.div id="pay-details" className="pay-details" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: reduce ? 0 : 0.24, ease: EASE }}>
                  <div className="pay-details-inner">
                    <p>The venue writes this rule in plain words. It&apos;s saved on Monad and applies to every tip until they change it.</p>
                    <a href={`${EXPLORER}/address/${poolAt ?? ""}`} target="_blank" rel="noreferrer">View the pool <ArrowUpRight size={14} aria-hidden /></a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* How much */}
            <h1 className="sr-only">{person ? `Leave a tip for ${person.name}` : "Leave a tip for the team"}</h1>
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
            {!person && (
              <section className="pay-route" aria-label="Where your tip goes">
                <div className="pay-route-head">
                  <span>Split</span>
                  <span className="pay-route-rule">{split ? `${pct(split.foh)} · ${pct(split.boh)} · ${pct(split.bar)}` : "…"}</span>
                </div>
                <div className="pay-bar" aria-hidden>
                  {GROUPS.map((g, i) => (
                    <motion.span key={g.key} className={`pay-seg pay-seg-${i}`} initial={false}
                      animate={{ flexGrow: split ? split[g.key] || 0.0001 : 1 }} transition={{ duration: reduce ? 0 : 0.6, ease: EASE }} />
                  ))}
                </div>
                <ul className="pay-legend">
                  {GROUPS.map((g, i) => (
                    <li key={g.key}>
                      <span className="pay-legend-label"><span className={`pay-dot pay-seg-${i}`} aria-hidden />{g.label}{split && <span className="pay-legend-pct">({pct(split[g.key])})</span>}</span>
                      <Roll value={policy && valid ? usd(share(g.key, dollars), true) : "—"} className="pay-legend-amount" />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Phones: a keypad, so the amount is typed straight in */}
            <div className="pay-keypad" role="group" aria-label="Keypad">
              {KEYS.map((k) => (
                <button key={k} type="button" className={pressed?.key === k ? "pay-key is-pressed" : "pay-key"} disabled={busy} onClick={() => press(k)} aria-label={k === "del" ? "Delete" : k === "." ? "Decimal point" : k}>
                  {k === "del" ? <Delete size={22} aria-hidden /> : k}
                </button>
              ))}
            </div>

            {/* One action that carries the whole journey */}
            <button type="button" className={`pay-send${busy ? " is-busy" : ""}`} onClick={primary} disabled={!valid || busy || badLink || !poolAt} aria-busy={busy || undefined}>
              <span className="pay-send-progress" aria-hidden />
              <motion.span className="pay-send-fill" aria-hidden initial={false}
                animate={{ scaleX: phase === "sending" ? 0.92 : phase === "confirm" ? 0.5 : phase === "approve" || phase === "minting" ? 0.3 : phase === "gas" ? 0.26 : preparing ? 0.22 : signingIn ? 0.1 : 0 }}
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
              {tx!.target === "pool" ? "It's in the team's tip pool, shared by the house rule." : `All of it went straight to ${tx!.target}'s wallet.`}
            </p>

            {tx!.target === "pool" ? (
              <ul className="pay-done-split">
                {GROUPS.filter((g) => !split || split[g.key] > 0).map((g, i) => (
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
                  <span className="pay-done-photo"><Image src={PHOTO[team.find((m) => m.name === tx!.target)?.group ?? 0]} alt="" fill sizes="48px" /></span>
                  <span className="pay-done-share">+{usd(tx!.dollars, true)}</span>
                  <span className="pay-done-label">{tx!.target}</span>
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
