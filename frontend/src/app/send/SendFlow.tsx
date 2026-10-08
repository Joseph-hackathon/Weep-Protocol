"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, ArrowUpRight, Check, ChevronLeft, Plus, X } from "lucide-react";
import { requestConnect, useWallet } from "../wallet-bridge";
import { AUSD, EXPLORER, FAUCET, approveData, ausdAllowance, ausdBalance, mintData, monBalance, transfersIn, waitForReceipt, type Moved } from "../chain";
import { MAX_RECIPIENTS, PAY, payData } from "../pay";
import { plan, sharesOf, type Mode, type Row } from "../allocate";
import { sendMessage } from "../send-message";

/**
 * Send (the individual's twin of the Merchant Portal): say who gets what in plain words, check the exact
 * amounts, send it in one payment.
 *   1 Say it   — one sentence or a list; the assistant turns it into rows (or add people yourself)
 *   2 Check it — every person, their exact amount and share, worked out by plain arithmetic (allocate.ts);
 *                anything unclear is asked, nothing is sent until it adds up
 *   3 Send     — one confirmation pays everyone at once through WeepPay; it lands in full or not at all
 *   4 Receipt  — what each person actually received, read from the transaction on Monad
 * People can be reached by email (they open it by signing in with that email) or by wallet address.
 */
type Stage = "say" | "check" | "done";
type Phase = "idle" | "signin" | "lookup" | "minting" | "approve" | "confirm" | "sending" | "pending";
type Person = Row & { key: number };

const EASE = [0.2, 0.8, 0.2, 1] as const;
const FACES = ["/hero/barista.jpg", "/hero/chefs.jpg", "/hero/bartender.jpg"];
const ONE = BigInt(10) ** BigInt(18);
const CENT = BigInt(10) ** BigInt(16);
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const isWallet = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s.trim());
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const cash = (u: bigint) => money(Number((u * BigInt(100)) / ONE));
const pct = (n: number) => (n >= 99.95 ? "100%" : n < 0.05 ? "0%" : `${n < 10 ? n.toFixed(1).replace(/\.0$/, "") : Math.round(n)}%`);
const initials = (n: string) => n.replace(/@.*/, "").trim().split(/[\s._-]+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
const rejected = (e: unknown) => /reject|denied|cancel/i.test(String((e as { message?: string })?.message ?? e)) || (e as { code?: number })?.code === 4001;
let nextKey = 1;
const person = (r: Partial<Row> = {}): Person => ({ key: nextKey++, name: r.name ?? "", contact: r.contact ?? "", mode: r.mode ?? "equal", value: r.value ?? 0 });

const READ_ERRORS: Record<string, string> = {
  "not-configured": "Reading sentences isn't switched on here yet. Add the people yourself instead.",
  "ai-failed": "Couldn't read that just now. Try again, or add the people yourself.",
  "too-long": "That's a lot of text. Keep it shorter, or add the people yourself.",
  empty: "Write who you're paying first.",
};
const MODES: { id: Mode; label: string }[] = [{ id: "equal", label: "Equal" }, { id: "percent", label: "%" }, { id: "fixed", label: "$" }];

export default function SendFlow() {
  const reduce = useReducedMotion();
  const wallet = useWallet();
  const address = wallet.address;
  const [stage, setStage] = useState<Stage>("say");
  const [text, setText] = useState("");
  // Anything typed in the first moment of a slow load, before the page took over, is kept and counted.
  const say = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const typed = say.current?.value ?? "";
    if (!typed) return;
    const t = setTimeout(() => setText((v) => v || typed), 0);
    return () => clearTimeout(t);
  }, []);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [total, setTotal] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Record<string, string>>({}); // email → wallet
  const [receipt, setReceipt] = useState<{ hash: string; totalCents: number; lines: { name: string; wallet: string; cents: number }[]; moved: Moved[] } | null>(null);
  const [pendingHash, setPendingHash] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null); // the contact being typed in shows in full
  const totalRef = useRef<HTMLInputElement>(null);

  // Someone's own link (/send?to=…&name=…) opens straight on paying them.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const to = q.get("to")?.trim() ?? "";
    if (!isEmail(to) && !isWallet(to)) return;
    const name = (q.get("name") ?? "").trim().slice(0, 40) || (isEmail(to) ? to.split("@")[0] : short(to));
    const t = setTimeout(() => {
      setPeople([person({ name, contact: to })]);
      setStage("check");
      setTimeout(() => totalRef.current?.focus(), 350);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const rows = useMemo(() => people.map(({ name, contact, mode, value }) => ({ name: name.trim(), contact: contact.trim(), mode, value })), [people]);
  const totalNum = total.trim() ? Number(total.replace(/[$,\s]/g, "")) : null;
  const p = useMemo(() => plan(totalNum !== null && Number.isFinite(totalNum) ? totalNum : null, rows), [rows, totalNum]);
  const shares = sharesOf(p);
  const unreachable = rows.findIndex((r) => !isEmail(r.contact) && !isWallet(r.contact));
  const unnamed = rows.findIndex((r) => !r.name);
  const issue = p.issue ?? (unnamed >= 0 ? "Give everyone a name." : unreachable >= 0 ? `Add an email or wallet for ${rows[unreachable].name}.` : rows.length > MAX_RECIPIENTS ? `Up to ${MAX_RECIPIENTS} people per payment.` : null);
  const ready = !issue && questions.length === 0;
  // Unfinished (nothing to fix yet: a total, a name or a contact still to type) is said once, on the button.
  // A real problem (amounts over the total, percentages over 100%, money left unassigned) gets the amber line.
  const unfinished = !rows.length || unnamed >= 0 || unreachable >= 0 || Boolean(p.issue?.startsWith("Enter how much")) || p.issue === "Add someone to pay.";
  const busy = phase !== "idle" && phase !== "pending";

  const edit = (key: number, patch: Partial<Row>) => setPeople((list) => list.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const add = () => setPeople((list) => [...list, person()]);
  const remove = (key: number) => setPeople((list) => list.filter((x) => x.key !== key));

  const read = async () => {
    setReadError(null);
    setReading(true);
    try {
      const res = await fetch("/api/send/parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await res.json();
      if (!res.ok) { setReadError(READ_ERRORS[data.error] ?? READ_ERRORS["ai-failed"]); return; }
      setPeople((data.rows as Row[]).map((r) => person(r)));
      setTotal(data.total > 0 ? String(data.total) : "");
      setQuestions(data.questions ?? []);
      setStage("check");
    } catch {
      setReadError(READ_ERRORS["ai-failed"]);
    } finally {
      setReading(false);
    }
  };
  const byHand = () => { setPeople((list) => (list.length ? list : [person(), person()])); setQuestions([]); setStage("check"); };

  /** The wallets behind the emails being paid (made for new people), approved by one signature. */
  const walletsFor = useCallback(async (emails: string[]) => {
    const missing = emails.filter((e) => !resolved[e]);
    if (!missing.length) return resolved;
    setPhase("lookup");
    const issuedAt = new Date().toISOString();
    const signature = await wallet.sign!(sendMessage(missing, issuedAt));
    const res = await fetch("/api/send/wallets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ emails: missing, issuedAt, signer: wallet.address, signature }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error === "not-configured" ? "Paying by email isn't switched on here yet. Use wallet addresses." : "Couldn't reach those emails just now. Nothing was sent.");
    const next = { ...resolved };
    for (const w of data.wallets as { email: string; wallet: string | null }[]) if (w.wallet) next[w.email] = w.wallet;
    setResolved(next);
    if (missing.some((e) => !next[e])) throw new Error("Couldn't reach every email just now. Nothing was sent.");
    return next;
  }, [resolved, wallet]);

  /** The whole payment: reach emails, top up test dollars if short, allow exactly the total, pay everyone at once. */
  const send = async () => {
    setMessage(null);
    if (!address || !wallet.send || !wallet.sign) { setPhase("signin"); requestConnect(); return; }
    if (!wallet.onMonad) { setMessage("Your wallet is on another network. Switch to Monad at the top, then send."); return; }
    try {
      if ((await monBalance(address)) === BigInt(0)) { setPhase("idle"); window.open(FAUCET, "_blank", "noopener"); setMessage("Sending needs a little MON for the network fee. Get some free from the faucet, then send."); return; }
      const emails = [...new Set(rows.filter((r) => isEmail(r.contact)).map((r) => r.contact.toLowerCase()))];
      const map = emails.length ? await walletsFor(emails) : resolved;
      const lines = rows.map((r, i) => ({ name: r.name, wallet: isEmail(r.contact) ? map[r.contact.toLowerCase()] : r.contact, cents: p.cents[i] }));
      const amounts = lines.map((l) => BigInt(l.cents) * CENT);
      const need = BigInt(p.totalCents) * CENT;

      if ((await ausdBalance(address)) < need) {
        setPhase("minting");
        const top = BigInt(Math.max(100, Math.ceil(p.totalCents / 100))) * ONE;
        const minted = await wallet.send({ to: AUSD, data: mintData(address, top) });
        if (!(await waitForReceipt(minted))) throw new Error("Couldn't add test dollars. Nothing was sent.");
      }
      if ((await ausdAllowance(address, PAY)) < need) {
        setPhase("approve");
        const ok = await wallet.send({ to: AUSD, data: approveData(PAY, need) });
        if (!(await waitForReceipt(ok))) throw new Error("Couldn't allow the payment. Nothing was sent.");
      }
      setPhase("confirm");
      const hash = await wallet.send({ to: PAY, data: payData(lines.map((l) => l.wallet), amounts) });
      setPhase("sending");
      let ok: boolean;
      try { ok = await waitForReceipt(hash); } catch { setPendingHash(hash); setPhase("pending"); return; }
      if (!ok) throw new Error("The network turned the payment down. Nothing was sent.");
      const moved = await transfersIn(hash, address).catch(() => [] as Moved[]);
      setReceipt({ hash, totalCents: p.totalCents, lines, moved });
      setPhase("idle");
      setStage("done");
      try { navigator.vibrate?.([12, 60, 12]); } catch {}
    } catch (e) {
      setPhase("idle");
      setMessage(rejected(e) ? "Cancelled. Nothing was sent." : (e as Error)?.message || "Something went wrong. Nothing was sent.");
    }
  };

  // Pressed Send before signing in: carry on by itself once the sign-in lands; stand down if it's closed.
  useEffect(() => {
    if (phase !== "signin" || !address || !wallet.send) return;
    const t = setTimeout(() => { send(); }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per sign-in
  }, [phase, address, wallet.send]);
  useEffect(() => {
    if (phase !== "signin") return;
    const onClosed = () => setTimeout(() => setPhase((was) => (was === "signin" && !document.querySelector(".btn-account") ? "idle" : was)), 1500);
    window.addEventListener("weep:connect-closed", onClosed);
    return () => window.removeEventListener("weep:connect-closed", onClosed);
  }, [phase]);

  /** A payment still confirming: look again without sending anything new. */
  const checkPending = async () => {
    if (!pendingHash || !address) return;
    setPhase("sending");
    try {
      const ok = await waitForReceipt(pendingHash, 30000);
      if (!ok) { setPendingHash(null); setPhase("idle"); setMessage("The network turned the payment down. Nothing was sent."); return; }
      const moved = await transfersIn(pendingHash, address).catch(() => [] as Moved[]);
      const lines = rows.map((r, i) => ({ name: r.name, wallet: isEmail(r.contact) ? resolved[r.contact.toLowerCase()] : r.contact, cents: p.cents[i] }));
      setReceipt({ hash: pendingHash, totalCents: p.totalCents, lines, moved });
      setPendingHash(null);
      setPhase("idle");
      setStage("done");
    } catch { setPhase("pending"); }
  };

  const fade = { initial: { opacity: 0, y: reduce ? 0 : 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: reduce ? 0 : -8 }, transition: { duration: reduce ? 0 : 0.26, ease: EASE } };
  const label =
    phase === "signin" ? "Signing in" :
    phase === "lookup" ? "Sign to reach their emails" :
    phase === "minting" ? "Adding test dollars" :
    phase === "approve" ? "Allow the payment in your wallet" :
    phase === "confirm" ? "Confirm in your wallet" :
    phase === "sending" ? "Sending" :
    phase === "pending" ? "Still confirming" :
    questions.length ? "Answer the questions above" :
    issue ? (!rows.length ? "Add someone to pay" : p.issue?.startsWith("Enter how much") ? "Enter the total" : unnamed >= 0 && !p.issue ? "Name everyone" : unreachable >= 0 && !p.issue ? "Add their email or wallet" : "Fix the amounts") :
    !address ? `Sign in to send ${money(p.totalCents)}` :
    `Send ${money(p.totalCents)}`;
  const count = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;

  return (
    <div className="pay m-wide">
      <AnimatePresence mode="wait" initial={false}>
        {/* 1 · Say it */}
        {stage === "say" && (
          <motion.div key="say" className="pay-card" {...fade}>
            <header className="pay-to">
              <span className="pay-faces" aria-hidden>
                {FACES.map((src) => <span key={src} className="pay-face"><Image src={src} alt="" fill sizes="32px" priority /></span>)}
              </span>
              <span className="pay-to-text">
                <span className="pay-to-name">Send</span>
                <span className="pay-status"><span className="pay-live" aria-hidden />One payment, everyone at once</span>
              </span>
            </header>
            <h1 className="m-ask">Who are you paying?</h1>
            <div className={`m-composer${reading ? " is-busy" : ""}`}>
              <label className="sr-only" htmlFor="s-text">Who you&apos;re paying, and how much</label>
              <textarea ref={say} id="s-text" className="m-input" rows={5} value={text} maxLength={6000} disabled={reading}
                placeholder={"$60 to Sam, Ama and Kai. Sam gets half.\nsam@mail.com, ama@mail.com, kai@mail.com"}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) read(); }} />
              <button type="button" className="m-send" onClick={read} disabled={!text.trim() || reading} aria-label="Read it">
                {reading ? <span className="m-spin" aria-hidden /> : <ArrowUp size={18} strokeWidth={2.5} aria-hidden />}
              </button>
            </div>
            {readError ? <p className="m-error" role="alert">{readError}</p> : <p className="m-quiet">{reading ? "Reading it…" : "You'll see every amount before anything is sent."}</p>}
            <button type="button" className="m-text-btn i-byhand" onClick={byHand}>Or add people yourself</button>
          </motion.div>
        )}

        {/* 2 · Check it: the exact payment, editable */}
        {stage === "check" && (
          <motion.div key="check" className="pay-card" {...fade}>
            <header className="pay-to">
              <button type="button" className="m-back" onClick={() => setStage("say")} aria-label="Back" disabled={busy}><ChevronLeft size={18} /></button>
              <span className="pay-to-text">
                <span className="pay-to-name">Check it</span>
                <span className="pay-status"><span className="pay-live" aria-hidden />{rows.length ? `${count(rows.length)}${p.totalCents ? ` · ${money(p.totalCents)}` : ""}` : "Nobody yet"}</span>
              </span>
            </header>

            {questions.length > 0 && (
              <div className="i-questions" role="status">
                <p className="i-questions-head">Before you send</p>
                <ul>{questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
                <button type="button" className="m-text-btn" onClick={() => setQuestions([])}>I&apos;ve fixed it below</button>
              </div>
            )}

            <label className="i-total">
              <span className="i-total-label">Total</span>
              <span className={total.trim() ? "i-total-field" : "i-total-field is-empty"}>
                <span aria-hidden>$</span>
                <input ref={totalRef} inputMode="decimal" value={total} style={{ width: `${Math.max(4, (total || (p.totalCents ? (p.totalCents / 100).toFixed(2) : "0.00")).length) + 0.5}ch` }} placeholder={p.totalCents && !total ? (p.totalCents / 100).toFixed(2) : "0.00"} disabled={busy}
                  onChange={(e) => setTotal(e.target.value.replace(/[^0-9.,]/g, ""))} aria-label="Total to send, in dollars" />
              </span>
            </label>

            <ul className="i-rows">
              {people.length > 0 && <li className="i-head" aria-hidden><span>Person</span><span>Gets</span></li>}
              <AnimatePresence initial={false}>
                {people.map((x, i) => {
                  const r = rows[i];
                  const bad = r.contact && !isEmail(r.contact) && !isWallet(r.contact);
                  return (
                    <motion.li key={x.key} className="i-row" layout={reduce ? false : "position"} initial={{ opacity: 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}>
                      <span className={x.name || x.contact ? "i-avatar" : "i-avatar is-empty"} aria-hidden>{x.name || x.contact ? initials(x.name || x.contact) : i + 1}</span>
                      <span className="i-who">
                        <input className="i-name" value={x.name} placeholder="Name" maxLength={40} disabled={busy} aria-label={`Person ${i + 1} name`} onChange={(e) => edit(x.key, { name: e.target.value })} />
                        <input className={`i-contact${bad || (!r.contact && r.name) ? " is-missing" : ""}`} placeholder="Email or wallet 0x…" disabled={busy} aria-label={`${x.name || `Person ${i + 1}`}: email or wallet`}
                          value={editing !== x.key && isWallet(x.contact) ? short(x.contact.trim()) : x.contact} title={x.contact || undefined}
                          onFocus={() => setEditing(x.key)} onBlur={() => setEditing(null)}
                          inputMode="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} onChange={(e) => edit(x.key, { contact: e.target.value })} />
                      </span>
                      <span className="i-rule">
                        <span className="i-modes" role="radiogroup" aria-label={`How ${x.name || "this person"}'s part is set`}>
                          {MODES.map((m) => (
                            <button key={m.id} type="button" role="radio" aria-checked={x.mode === m.id} className="i-mode" disabled={busy}
                              onClick={() => edit(x.key, { mode: m.id, value: m.id === x.mode ? x.value : m.id === "equal" ? 0 : m.id === "percent" ? Math.round(shares[i] || 0) : (p.cents[i] || 0) / 100 })}>{m.label}</button>
                          ))}
                        </span>
                        {x.mode !== "equal" && (
                          <input className="i-value" inputMode="decimal" value={x.value ? String(x.value) : ""} placeholder={x.mode === "percent" ? "%" : "$"} disabled={busy}
                            aria-label={x.mode === "percent" ? `${x.name}'s percent` : `${x.name}'s amount in dollars`}
                            onChange={(e) => edit(x.key, { value: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })} />
                        )}
                      </span>
                      <span className="i-amount">
                        <b className={p.cents[i] > 0 ? undefined : "is-empty"}>{money(p.cents[i] > 0 ? p.cents[i] : 0)}</b>
                        <small>{p.cents[i] > 0 ? pct(shares[i]) : ""}{p.extraCents.includes(i) ? " · +1¢" : ""}</small>
                      </span>
                      <button type="button" className="m-remove" aria-label={`Remove ${x.name || `person ${i + 1}`}`} disabled={busy} onClick={() => remove(x.key)}><X size={14} /></button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
            {people.length < MAX_RECIPIENTS && <button type="button" className="m-text-btn m-add i-add" onClick={add} disabled={busy}><Plus size={14} aria-hidden /> Add someone</button>}

            {!(issue && unfinished) && (
            <div className={`i-sum${issue ? " is-off" : ""}`} role="status">
              {issue
                ? <span>{issue}</span>
                : <span><Check size={14} strokeWidth={3} aria-hidden /> Adds up: {money(p.totalCents)} to {count(rows.length)}, no fee, all in one payment.{p.extraCents.length ? ` ${p.extraCents.length === 1 ? "One person gets" : `${p.extraCents.length} people get`} 1¢ more so it's exact.` : ""}</span>}
            </div>
            )}

            <button type="button" className={`pay-send${busy ? " is-busy" : ""}`} onClick={phase === "pending" ? checkPending : send} disabled={(!ready && phase !== "pending") || busy} aria-busy={busy || undefined}>
              <span className="pay-send-progress" aria-hidden />
              <motion.span className="pay-send-fill" aria-hidden initial={false}
                animate={{ scaleX: phase === "sending" ? 0.92 : phase === "confirm" ? 0.6 : phase === "approve" || phase === "minting" ? 0.4 : phase === "lookup" ? 0.25 : phase === "signin" ? 0.1 : 0 }}
                transition={{ duration: reduce ? 0 : phase === "sending" ? 2.6 : 0.4, ease: phase === "sending" ? [0.1, 0.6, 0.3, 1] : EASE }} />
              <span className="pay-send-label">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={label} initial={{ y: reduce ? 0 : 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: reduce ? 0 : -14, opacity: 0 }} transition={{ duration: reduce ? 0 : 0.24, ease: EASE }}>
                    {label}{busy && <span className="pay-ellipsis" aria-hidden />}
                  </motion.span>
                </AnimatePresence>
              </span>
            </button>
            {phase === "pending" && pendingHash ? (
              <p className="m-warn" role="status">Sent, but Monad hasn&apos;t confirmed it yet. It isn&apos;t complete until it confirms. <a href={`${EXPLORER}/tx/${pendingHash}`} target="_blank" rel="noreferrer">Track it</a> or tap to check again.</p>
            ) : message ? <p className="m-error" role="alert">{message}</p> : null}
          </motion.div>
        )}

        {/* 4 · Receipt: what each person actually received, from the transaction itself */}
        {stage === "done" && receipt && (
          <motion.div key="done" className="pay-card pay-done" {...fade}>
            <svg className="pay-check" viewBox="0 0 64 64" aria-hidden>
              <motion.circle cx="32" cy="32" r="29" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.5, ease: EASE }} />
              <motion.path d="M20 33 l8 8 l16 -18" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.4, ease: EASE }} />
            </svg>
            <h1 className="pay-done-amount">{money(receipt.totalCents)} sent</h1>
            <p className="pay-done-sub">Confirmed on Monad. This is what each person received:</p>
            <ul className="i-proof" aria-label="Confirmed transfers">
              {receipt.moved.map((m, i) => {
                const who = receipt.lines.find((l) => l.wallet?.toLowerCase() === m.to.toLowerCase());
                return (
                  <motion.li key={`${m.to}-${i}`} initial={{ opacity: 0, y: reduce ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : 0.45 + Math.min(i, 10) * 0.05, ease: EASE }}>
                    <span className="i-proof-check" aria-hidden><Check size={12} strokeWidth={3} /></span>
                    <span className="i-proof-name">{who?.name ?? short(m.to)}</span>
                    <a className="i-proof-wallet" href={`${EXPLORER}/address/${m.to}`} target="_blank" rel="noreferrer">{short(m.to)}</a>
                    <span className="i-proof-amount">+{cash(m.units)}</span>
                  </motion.li>
                );
              })}
            </ul>
            <dl className="pay-receipt">
              <div><dt>Delivered</dt><dd>{cash(receipt.moved.reduce((a, m) => a + m.units, BigInt(0)))} of {money(receipt.totalCents)}</dd></div>
              <div><dt>Platform fee</dt><dd>$0</dd></div>
              <div><dt>Receipt</dt><dd><a href={`${EXPLORER}/tx/${receipt.hash}`} target="_blank" rel="noreferrer">{receipt.hash.slice(0, 6)}…{receipt.hash.slice(-4)} <ArrowUpRight size={14} aria-hidden /></a></dd></div>
            </dl>
            {rows.some((r) => isEmail(r.contact)) && <p className="m-quiet">People paid by email open it in My money by signing in with that email.</p>}
            <button type="button" className="btn-connect pay-again" onClick={() => { setStage("check"); setReceipt(null); }}>Pay them again</button>
            <Link href="/money" className="m-text-btn m-link">See My money</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
