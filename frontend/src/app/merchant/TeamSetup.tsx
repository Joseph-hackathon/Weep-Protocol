"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, ArrowUpRight, Check, ChevronLeft, Copy, Download, Minus, Plus, X } from "lucide-react";
import { requestConnect, useWallet } from "../wallet-bridge";
import {
  EXPLORER, FAUCET, WEEP, createVenueData, createdVenueId, monBalance, myVenues, readVenue, updateVenueData, waitForReceipt, type Venue,
} from "../chain";
import { setupMessage } from "../setup-message";

/**
 * Merchant Portal (DOCS.md §4.3): any business opens its own venue in one message.
 *   1 Describe — the venue, the team, emails, roles and the tip rule, in plain words, in one box
 *   2 Review   — Gemini's reading, which the merchant corrects before anything is saved
 *   3 Save     — Privy pre-generates a wallet per email; the venue (name, rule, team) is saved in one confirmation
 *   4 Live     — a tip link and a QR code for the tables; tips land straight in the team's wallets
 * The connected wallet becomes the venue's admin: only it can change this venue, and it can't touch anyone else's.
 * A wallet that already runs a venue opens straight on it.
 */
type Group = "floor" | "kitchen" | "bar";
type Person = { name: string; email: string; group: Group; wallet?: string | null };
type Split = { foh: number; boh: number; bar: number };
type Stage = "describe" | "review" | "save" | "live";
type StepState = "idle" | "working" | "done" | "error";

const GROUPS: { key: Group; label: string; pool: keyof Split }[] = [
  { key: "floor", label: "Floor", pool: "foh" },
  { key: "kitchen", label: "Kitchen", pool: "boh" },
  { key: "bar", label: "Bar", pool: "bar" },
];
const GROUP_INDEX: Record<Group, 0 | 1 | 2> = { floor: 0, kitchen: 1, bar: 2 };
const GROUP_KEYS: Group[] = ["floor", "kitchen", "bar"];
const NEXT_GROUP: Record<Group, Group> = { floor: "kitchen", kitchen: "bar", bar: "floor" };
const EASE = [0.2, 0.8, 0.2, 1] as const;
const FACES = ["/hero/barista.jpg", "/hero/chefs.jpg", "/hero/bartender.jpg"];
const usd = (d: number) => `$${d.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const rejected = (e: unknown) => /reject|denied|cancel/i.test(String((e as { message?: string })?.message ?? e)) || (e as { code?: number })?.code === 4001;
const tipLink = (id: number) => `${typeof window === "undefined" ? "" : window.location.origin}/customer?venue=${id}`;

const PARSE_ERRORS: Record<string, string> = {
  "not-configured": "The setup assistant isn't switched on yet. It needs the Gemini key on the server.",
  "ai-failed": "Couldn't read that just now. Try again, or write it a little more simply.",
  "too-long": "That's a lot of text. Keep it under 4,000 characters.",
  empty: "Write a few lines about your team first.",
};
const WALLET_ERRORS: Record<string, string> = {
  "not-configured": "Wallet creation isn't switched on yet. It needs the Privy app secret on the server.",
  "bad-signature": "The signature didn't match this wallet. Try again.",
  unsigned: "The approval was missing. Try again.",
  expired: "That approval expired. Try again.",
  "bad-emails": "Every new person needs a valid email address.",
};

export default function TeamSetup() {
  const reduce = useReducedMotion();
  const wallet = useWallet();
  const address = wallet.address?.toLowerCase() ?? null;

  const [stage, setStage] = useState<Stage>("describe");
  const [text, setText] = useState("");
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [split, setSplit] = useState<Split>({ foh: 60, boh: 30, bar: 10 });
  const [notes, setNotes] = useState<string[]>([]);
  const [steps, setSteps] = useState<{ wallets: StepState; venue: StepState }>({ wallets: "idle", venue: "idle" });
  const [running, setRunning] = useState(false);
  const [venue, setVenue] = useState<Venue | null>(null);  // the venue this wallet runs (saved on Monad)
  const [editing, setEditing] = useState<number | null>(null); // saving updates this venue instead of opening one
  const [justOpened, setJustOpened] = useState(false);
  const [gas, setGas] = useState<{ of: string; mon: bigint } | null>(null);

  // A wallet that already runs a venue opens straight on it.
  useEffect(() => {
    if (!address) return;
    let live = true;
    myVenues(address).then((list) => {
      if (!live || !list.length) return;
      setVenue(list[0]);
      setStage((s) => (s === "describe" && !text.trim() ? "live" : s));
    }).catch(() => {});
    monBalance(address).then((mon) => live && setGas({ of: address, mon })).catch(() => {});
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per wallet
  }, [address]);

  const total = split.foh + split.boh + split.bar;
  const needsWallet = people.filter((p) => !p.wallet);
  const emailsOk = needsWallet.every((p) => isEmail(p.email));
  // Customers tip a person by name, so two people can't share one.
  const namesOk = people.every((p) => p.name.trim()) && new Set(people.map((p) => p.name.trim().toLowerCase())).size === people.length;
  const reviewOk = name.trim().length > 0 && people.length > 0 && people.length <= 50 && total === 100 && emailsOk && namesOk;
  const noGas = Boolean(address && gas && gas.of === address && gas.mon === BigInt(0));

  const read = async () => {
    setError(null);
    setReading(true);
    try {
      const res = await fetch("/api/setup/parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await res.json();
      if (!res.ok) { setError(PARSE_ERRORS[data.error] ?? PARSE_ERRORS["ai-failed"]); return; }
      const parsed = (data.employees as Person[]).map((p) => ({ ...p, wallet: null as string | null }));
      if (editing !== null) {
        // Editing: the message adds people or changes someone by name; everyone else stays, wallets and all.
        setPeople((list) => {
          const out = [...list];
          parsed.forEach((p) => {
            const i = out.findIndex((x) => x.name.trim().toLowerCase() === p.name.trim().toLowerCase());
            if (i < 0) out.push(p); else out[i] = { ...out[i], group: p.group, email: p.email || out[i].email };
          });
          return out;
        });
        if (data.splitGiven) setSplit(data.pool);
      } else {
        setPeople(parsed);
        setSplit(data.pool);
      }
      // Editing without a new rule keeps the venue's own, so a note about the default rule doesn't apply.
      setNotes(((data.notes ?? []) as string[]).filter((n) => editing === null || data.splitGiven || !/split|default|60/i.test(n)));
      if (data.venue && !(editing !== null && name.trim())) setName(data.venue);
      setStage("review");
    } catch {
      setError(PARSE_ERRORS["ai-failed"]);
    } finally {
      setReading(false);
    }
  };

  /** Runs the save steps in order, resuming from the first one not done. */
  const save = async () => {
    if (!address || !wallet.send || !wallet.sign) { requestConnect(); return; }
    if (noGas) { window.open(FAUCET, "_blank", "noopener"); return; }
    setError(null);
    setRunning(true);
    let team = people;
    try {
      // 1 · Wallets for anyone new (Privy pre-generation), approved by this wallet's signature
      if (steps.wallets !== "done") {
        const emails = team.filter((p) => !p.wallet).map((p) => p.email.trim().toLowerCase());
        if (emails.length) {
          setSteps((s) => ({ ...s, wallets: "working" }));
          const issuedAt = new Date().toISOString();
          const signature = await wallet.sign(setupMessage(emails, issuedAt));
          const res = await fetch("/api/setup/wallets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ emails, issuedAt, signer: wallet.address, signature }) });
          const data = await res.json();
          if (!res.ok) throw new Error(WALLET_ERRORS[data.error] ?? "Couldn't create the wallets. Try again.");
          const byEmail = new Map<string, string | null>(data.wallets.map((w: { email: string; wallet: string | null }) => [w.email, w.wallet]));
          team = team.map((p) => (p.wallet ? p : { ...p, wallet: byEmail.get(p.email.trim().toLowerCase()) ?? null }));
          setPeople(team);
          if (team.some((p) => !p.wallet)) throw new Error("Some wallets couldn't be created. Try again.");
        }
        setSteps((s) => ({ ...s, wallets: "done" }));
      }

      // 2 · The venue (name, rule, team) on Monad, in one confirmation
      setSteps((s) => ({ ...s, venue: "working" }));
      const setup = {
        name: name.trim(),
        split,
        team: team.map((p) => ({ name: p.name.trim(), wallet: p.wallet as string, group: GROUP_INDEX[p.group] })),
      };
      const hash = await wallet.send({ to: WEEP, data: editing !== null ? updateVenueData(editing, setup) : createVenueData(setup) });
      if (!(await waitForReceipt(hash))) throw new Error("Monad turned the venue down. Check every name is different, then try again.");
      const id = editing ?? (await createdVenueId(hash));
      if (id === null) throw new Error("Saved, but couldn't read the new venue back. Refresh the page.");
      setVenue(await readVenue(id));
      setSteps((s) => ({ ...s, venue: "done" }));
      setJustOpened(editing === null);
      setStage("live");
    } catch (e) {
      setSteps((s) => ({ wallets: s.wallets === "working" ? "error" : s.wallets, venue: s.venue === "working" ? "error" : s.venue }));
      setError(rejected(e) ? "Cancelled in your wallet. Nothing more was saved." : (e as Error)?.message || "Something went wrong.");
    } finally {
      setRunning(false);
    }
  };

  const reset = () => { setPeople([]); setNotes([]); setError(null); setSteps({ wallets: "idle", venue: "idle" }); setJustOpened(false); };
  const openAnother = () => { reset(); setText(""); setName(""); setSplit({ foh: 60, boh: 30, bar: 10 }); setEditing(null); setStage("describe"); };
  const editVenue = () => {
    if (!venue) return;
    reset();
    setEditing(venue.id);
    setName(venue.name);
    setSplit(venue.split);
    setPeople(venue.team.map((m) => ({ name: m.name, email: "", group: GROUP_KEYS[m.group], wallet: m.wallet })));
    setStage("review");
  };

  const fade = { initial: { opacity: 0, y: reduce ? 0 : 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: reduce ? 0 : -8 }, transition: { duration: reduce ? 0 : 0.26, ease: EASE } };
  const count = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;

  const header = (title: string, status: string, back?: () => void) => (
    <header className="pay-to">
      {back ? (
        <button type="button" className="m-back" onClick={back} aria-label="Back" disabled={running}><ChevronLeft size={18} /></button>
      ) : (
        <span className="pay-faces" aria-hidden>
          {FACES.map((src) => <span key={src} className="pay-face"><Image src={src} alt="" fill sizes="32px" priority /></span>)}
        </span>
      )}
      <span className="pay-to-text">
        <span className="pay-to-name">{title}</span>
        <span className="pay-status"><span className="pay-live" aria-hidden />{status}</span>
      </span>
    </header>
  );

  return (
    <div className="pay m-wide">
      <AnimatePresence mode="wait" initial={false}>
        {/* 1 · Describe: one message, like briefing a new manager */}
        {stage === "describe" && (
          <motion.div key="describe" className="pay-card" {...fade}>
            {header(editing !== null && venue ? venue.name : "Open your venue", editing !== null ? "Add or change people" : "Set up in one message", editing !== null || venue ? () => setStage(editing !== null ? "review" : "live") : undefined)}
            <h1 className="m-ask">Who works with you, and how should tips be shared?</h1>
            <div className={`m-composer${reading ? " is-busy" : ""}`}>
              <label className="sr-only" htmlFor="m-text">Your venue, team and tip rule</label>
              <textarea
                id="m-text" className="m-input" rows={6} value={text} maxLength={4000} disabled={reading}
                placeholder="Your venue's name, then each person's name and email, whether they work the floor, kitchen or bar, and how team tips split."
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) read(); }}
              />
              <button type="button" className="m-send" onClick={read} disabled={!text.trim() || reading} aria-label="Read it">
                {reading ? <span className="m-spin" aria-hidden /> : <ArrowUp size={18} strokeWidth={2.5} aria-hidden />}
              </button>
            </div>
            {error ? <p className="m-error" role="alert">{error}</p> : <p className="m-quiet">{reading ? "Reading your team…" : "You'll check everything before it's saved."}</p>}
          </motion.div>
        )}

        {/* 2 · Review */}
        {stage === "review" && (
          <motion.div key="review" className="pay-card" {...fade}>
            {header(editing !== null ? "Edit your venue" : "Your venue", count(people.length), () => setStage("describe"))}

            {notes.length > 0 && <p className="m-note">{notes.join(" ")}</p>}

            <label className="m-field">
              <span className="m-field-label">Venue name</span>
              <input className="m-field-input" value={name} maxLength={60} placeholder="e.g. the name on your sign" onChange={(e) => setName(e.target.value)} />
            </label>

            <ul className="m-people">
              {people.map((p, i) => (
                <li key={i} className="m-person">
                  <span className={`m-avatar m-avatar-${p.group}`} aria-hidden>{initials(p.name) || "?"}</span>
                  <span className="m-person-text">
                    <span className="m-person-name">{p.name}</span>
                    {p.wallet
                      ? <span className="m-person-email">Wallet {short(p.wallet)}</span>
                      : <span className={isEmail(p.email) ? "m-person-email" : "m-person-email is-missing"}>{p.email || "Needs an email"}</span>}
                  </span>
                  <button type="button" className={`m-role m-role-${p.group}`} aria-label={`${p.name}: ${p.group}. Tap to change`}
                    onClick={() => setPeople((list) => list.map((x, j) => (j === i ? { ...x, group: NEXT_GROUP[x.group] } : x)))}>
                    {GROUPS.find((g) => g.key === p.group)?.label}
                  </button>
                  <button type="button" className="m-remove" aria-label={`Remove ${p.name}`} onClick={() => setPeople((list) => list.filter((_, j) => j !== i))}><X size={14} /></button>
                </li>
              ))}
            </ul>
            {editing !== null && <button type="button" className="m-text-btn m-add" onClick={() => setStage("describe")}><Plus size={14} aria-hidden /> Add or change people</button>}

            <section className="pay-route" aria-label="How team tips are split">
              <div className="pay-route-head">
                <span>Split</span>
                <span className={total === 100 ? "pay-route-rule" : "pay-route-rule m-off"}>{total === 100 ? `${split.foh}% · ${split.boh}% · ${split.bar}%` : `${total}% of 100%`}</span>
              </div>
              <div className="pay-bar" aria-hidden>
                {GROUPS.map((g, i) => (
                  <motion.span key={g.key} className={`pay-seg pay-seg-${i}`} initial={false} animate={{ flexGrow: split[g.pool] || 0.0001 }} transition={{ duration: reduce ? 0 : 0.4, ease: EASE }} />
                ))}
              </div>
              <ul className="pay-legend">
                {GROUPS.map((g, i) => (
                  <li key={g.key}>
                    <span className="pay-legend-label"><span className={`pay-dot pay-seg-${i}`} aria-hidden />{g.label}</span>
                    <span className="m-stepper">
                      <button type="button" aria-label={`Less to ${g.label}`} onClick={() => setSplit((p) => ({ ...p, [g.pool]: Math.max(0, p[g.pool] - 5) }))}><Minus size={12} /></button>
                      <output aria-live="polite">{split[g.pool]}%</output>
                      <button type="button" aria-label={`More to ${g.label}`} onClick={() => setSplit((p) => ({ ...p, [g.pool]: Math.min(100, p[g.pool] + 5) }))}><Plus size={12} /></button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <button type="button" className="pay-send" onClick={() => { setSteps({ wallets: "idle", venue: "idle" }); setError(null); setStage("save"); }} disabled={!reviewOk}>
              <span className="pay-send-label"><span>{
                reviewOk ? (editing !== null ? "Save changes" : "Open the venue")
                  : !name.trim() ? "Name your venue"
                  : people.length === 0 ? "Add someone first"
                  : people.length > 50 ? "Up to 50 people"
                  : total !== 100 ? "Make the split 100%"
                  : !emailsOk ? "Everyone new needs an email"
                  : "Give everyone a different name"
              }</span></span>
            </button>
            <p className="m-quiet">Team tips are split by this rule. A tip to someone by name goes 100% to them.</p>
          </motion.div>
        )}

        {/* 3 · Save */}
        {stage === "save" && (
          <motion.div key="save" className="pay-card" {...fade}>
            {header(name.trim() || "Your venue", running ? "Confirm in your wallet when asked" : `${count(people.length)} · ${split.foh}/${split.boh}/${split.bar}`, () => setStage("review"))}

            <ul className="m-progress">
              <Step state={steps.wallets} title={needsWallet.length ? `Wallets for ${count(needsWallet.length)}` : "Wallets"}
                detail={steps.wallets === "done" || !needsWallet.length ? "Ready" : "One signature"} />
              <Step state={steps.venue} title={editing !== null ? "Save the changes" : "Open the venue"} detail={steps.venue === "done" ? "Saved on Monad" : "One confirmation"} />
            </ul>

            {steps.wallets === "done" && people.some((p) => p.wallet) && (
              <ul className="m-wallets">
                {people.map((p, i) => (
                  <li key={i}><span className={`m-avatar m-avatar-${p.group}`} aria-hidden>{initials(p.name)}</span><span className="m-person-name">{p.name}</span><span className="m-wallet">{p.wallet ? short(p.wallet) : "—"}</span></li>
                ))}
              </ul>
            )}

            {address && !wallet.onMonad && <p className="m-warn">Your wallet is on another network. Switch to Monad at the top.</p>}
            {address && wallet.onMonad && noGas && <p className="m-warn">Saving needs a little MON for the network fee. It&apos;s free from the Monad faucet.</p>}

            <button type="button" className={`pay-send${running ? " is-busy" : ""}`} onClick={save}
              disabled={running || (Boolean(address) && !wallet.onMonad)} aria-busy={running || undefined}>
              <span className="pay-send-progress" aria-hidden />
              <motion.span className="pay-send-fill" aria-hidden initial={false}
                animate={{ scaleX: [steps.wallets, steps.venue].filter((x) => x === "done").length / 2 }}
                transition={{ duration: reduce ? 0 : 0.5, ease: EASE }} />
              <span className="pay-send-label"><span>
                {running ? <>Saving<span className="pay-ellipsis" aria-hidden /></>
                  : !address ? "Connect to save"
                  : noGas ? "Get MON for the network fee"
                  : error ? "Try again"
                  : editing !== null ? "Save changes" : "Open the venue"}
              </span></span>
            </button>
            {error ? <p className="m-error" role="alert">{error}</p> : <p className="m-quiet">The wallet you save with runs this venue. Only it can change it.</p>}
          </motion.div>
        )}

        {/* 4 · Live */}
        {stage === "live" && venue && (
          <motion.div key={`live-${venue.id}`} className="pay-card pay-done" {...fade}>
            {justOpened && (
              <svg className="pay-check" viewBox="0 0 64 64" aria-hidden>
                <motion.circle cx="32" cy="32" r="29" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.5, ease: EASE }} />
                <motion.path d="M20 33 l8 8 l16 -18" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.4, ease: EASE }} />
              </svg>
            )}
            <h1 className="pay-done-amount">{justOpened ? `${venue.name} is live` : venue.name}</h1>
            <p className="pay-done-sub">
              {justOpened
                ? "Put this QR code on your tables. Tips land in your team's wallets the moment they're sent."
                : `${count(venue.team.length)} · ${venue.split.foh}/${venue.split.boh}/${venue.split.bar} · ${usd(venue.tipped)} tipped so far`}
            </p>

            <TipQr id={venue.id} name={venue.name} />

            <ul className="m-wallets">
              {venue.team.map((m) => (
                <li key={m.name}>
                  <span className={`m-avatar m-avatar-${GROUP_KEYS[m.group]}`} aria-hidden>{initials(m.name)}</span>
                  <span className="m-person-name">{m.name}</span>
                  <a className="m-wallet" href={`${EXPLORER}/address/${m.wallet}`} target="_blank" rel="noreferrer">{short(m.wallet)} <ArrowUpRight size={12} aria-hidden /></a>
                </li>
              ))}
            </ul>

            <Link href={`/customer?venue=${venue.id}`} className="pay-again m-link">See what customers see</Link>
            <div className="m-live-actions">
              <button type="button" className="m-text-btn" onClick={editVenue}>Edit the team</button>
              <button type="button" className="m-text-btn" onClick={openAnother}>Open another venue</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The venue's tip link as a QR code for the tables, with copy and a print-ready download. */
function TipQr({ id, name }: { id: number; name: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const link = tipLink(id);
  useEffect(() => {
    let live = true;
    import("qrcode").then((QR) => QR.toString(link, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0d0b14", light: "#ffffff" } }))
      .then((s) => live && setSvg(s)).catch(() => {});
    return () => { live = false; };
  }, [link]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const download = async () => {
    const QR = await import("qrcode");
    const url = await QR.toDataURL(link, { width: 1024, margin: 2, errorCorrectionLevel: "M" });
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "venue"}-tip-qr.png`;
    a.click();
  };
  return (
    <section className="m-qr" aria-label="Your tip link">
      <span className="m-qr-code" role="img" aria-label={`QR code for ${link}`} dangerouslySetInnerHTML={svg ? { __html: svg } : undefined} />
      <span className="m-qr-side">
        <span className="m-qr-label">Tip link</span>
        <span className="m-qr-link">{(() => { const [host, ...rest] = link.replace(/^https?:\/\//, "").split("/"); return <><span>{host}</span><wbr /><span>/{rest.join("/")}</span></>; })()}</span>
        <span className="m-qr-actions">
          <button type="button" onClick={copy}>{copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}{copied ? "Copied" : "Copy link"}</button>
          <button type="button" onClick={download}><Download size={14} aria-hidden />QR for printing</button>
        </span>
      </span>
    </section>
  );
}

function Step({ state, title, detail }: { state: StepState; title: string; detail: string }) {
  return (
    <li className={`m-line is-${state}`}>
      <span className="m-line-dot" aria-hidden>{state === "done" ? <Check size={11} strokeWidth={3} /> : state === "working" ? <span className="m-spin" /> : null}</span>
      <span className="m-line-title">{title}</span>
      <span className="m-line-detail">{detail}</span>
      <span className="sr-only">{state === "done" ? "done" : state === "working" ? "in progress" : state === "error" ? "failed" : "to do"}</span>
    </li>
  );
}
