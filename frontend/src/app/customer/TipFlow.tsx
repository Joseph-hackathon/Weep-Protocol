"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ChevronRight, Delete } from "lucide-react";
import { requestConnect, useWallet } from "../wallet-bridge";
import {
  AUSD, EXPLORER, FAUCET, WEEP, approveData, ausdAllowance, ausdBalance, listVenues, mintData, monBalance, readVenue, teamShares,
  tipPersonData, tipTeamData, toDollars, toUnits, waitForReceipt, type Member, type Venue,
} from "../chain";

/**
 * Customer space (DOCS.md §4.1) as one payment card, on live Monad testnet data.
 *   Where: a venue's link or table QR opens its card (?venue=ID); without one, a directory of venues.
 *   Who:   the whole team, or one person by name.
 *   How much: typed straight in (keypad on every device, keyboard on desktop).
 *   One action: the button carries the whole journey (sign in → allow → confirm → sending → done).
 * Payment is real: test AUSD goes straight into the team's wallets in the same transaction (team tips are
 * split by the venue's rule), with an explorer receipt. Nothing waits in a pool; nobody has to claim.
 */
type Phase = "idle" | "minting" | "approve" | "confirm" | "sending" | "done";
const GROUPS = [
  { key: "foh", label: "Floor", photo: "/hero/barista.jpg" }, // front of house
  { key: "boh", label: "Kitchen", photo: "/hero/chefs.jpg" },
  { key: "bar", label: "Bar", photo: "/hero/bartender.jpg" },
] as const;
const PHOTO = GROUPS.map((g) => g.photo); // a person's face follows their group
const QUICK = [1, 2, 5];
const TEST_DOLLARS = 100;
const EASE = [0.2, 0.8, 0.2, 1] as const;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

const usd = (d: number, cents = false) =>
  `$${d.toLocaleString("en-US", { minimumFractionDigits: cents || d % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const rejected = (e: unknown) => /reject|denied|cancel/i.test(String((e as { message?: string })?.message ?? e)) || (e as { code?: number })?.code === 4001;
const groupsIn = (team: Member[]) => GROUPS.map((g, i) => ({ ...g, i, count: team.filter((m) => m.group === i).length })).filter((g) => g.count > 0);

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

/** The venue in the address (?venue=ID): undefined while rendering on the server, null when there is none. */
const onVenueChange = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  window.addEventListener("weep:venue", cb);
  return () => { window.removeEventListener("popstate", cb); window.removeEventListener("weep:venue", cb); };
};
const venueInUrl = () => {
  const v = new URLSearchParams(window.location.search).get("venue");
  return v && /^\d{1,9}$/.test(v) ? Number(v) : null;
};
function openVenue(id: number | null) {
  const u = new URL(window.location.href);
  if (id === null) u.searchParams.delete("venue"); else u.searchParams.set("venue", String(id));
  window.history.pushState(null, "", u);
  window.dispatchEvent(new Event("weep:venue"));
  window.scrollTo({ top: 0 });
}

export default function TipFlow() {
  const id = useSyncExternalStore(onVenueChange, venueInUrl, () => undefined);
  if (id === undefined) return <div className="pay" />;
  return id === null ? <VenueList /> : <TipCard key={id} id={id} />;
}

/* ── Where: every venue on Monad ─────────────────────────────────────────────────────────────── */

function VenueList() {
  const reduce = useReducedMotion();
  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => {
    let live = true;
    listVenues().then((v) => live && setVenues(v)).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, []);
  const shown = useMemo(() => (venues ?? []).filter((v) => v.name.toLowerCase().includes(q.trim().toLowerCase())), [venues, q]);

  return (
    <div className="pay">
      <motion.div className="pay-card" initial={{ opacity: 0, y: reduce ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}>
        <header className="pay-to">
          <span className="pay-faces" aria-hidden>
            {GROUPS.map((g) => <span key={g.key} className="pay-face"><Image src={g.photo} alt="" fill sizes="32px" priority /></span>)}
          </span>
          <span className="pay-to-text">
            <h1 className="pay-to-name">Who are you tipping?</h1>
            <span className="pay-status">
              <span className="pay-live" aria-hidden />
              {failed ? "Couldn't reach Monad. Try again in a moment." : venues === null ? "Finding venues…" : `${venues.length} ${venues.length === 1 ? "venue" : "venues"} on Monad`}
            </span>
          </span>
        </header>

        {venues !== null && venues.length > 5 && (
          <input className="v-search" type="search" placeholder="Search venues" aria-label="Search venues" value={q} onChange={(e) => setQ(e.target.value)} />
        )}

        {venues === null ? (
          <ul className="v-list" aria-hidden>{[0, 1, 2].map((i) => <li key={i}><span className="v-row v-row-skeleton balance-skeleton" /></li>)}</ul>
        ) : venues.length === 0 ? (
          <>
            <p className="v-empty">No venues yet. Restaurants, bars and cafés open theirs in the Merchant Portal.</p>
            <Link href="/merchant" className="btn-connect pay-again m-link">Open a venue</Link>
          </>
        ) : (
          <ul className="v-list">
            {shown.map((v, i) => (
              <motion.li key={v.id} initial={{ opacity: 0, y: reduce ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.24, delay: reduce ? 0 : Math.min(i, 8) * 0.04, ease: EASE }}>
                <button type="button" className="v-row" onClick={() => openVenue(v.id)}>
                  <span className="pay-faces" aria-hidden>
                    {groupsIn(v.team).map((g) => <span key={g.key} className="pay-face"><Image src={g.photo} alt="" fill sizes="32px" /></span>)}
                  </span>
                  <span className="v-row-text">
                    <span className="v-row-name">{v.name}</span>
                    <span className="v-row-meta">{v.team.length} {v.team.length === 1 ? "person" : "people"}{v.tipped > 0 ? ` · ${usd(v.tipped)} tipped` : ""}</span>
                  </span>
                  <ChevronRight size={18} aria-hidden className="v-row-go" />
                </button>
              </motion.li>
            ))}
            {shown.length === 0 && <li className="v-empty">Nothing called “{q.trim()}”.</li>}
          </ul>
        )}
        <p className="m-quiet">At a venue? Scan the QR code on your table or receipt.</p>
      </motion.div>
    </div>
  );
}

/* ── Who, how much, send ─────────────────────────────────────────────────────────────────────── */

function TipCard({ id }: { id: number }) {
  const reduce = useReducedMotion();
  const wallet = useWallet();
  const address = wallet.address;
  const [venue, setVenue] = useState<Venue | null>(null);
  const [missing, setMissing] = useState(false);
  const [funds, setFunds] = useState<{ ausd: bigint; mon: bigint; of: string } | null>(null);
  const [entry, setEntry] = useState("2");
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [tx, setTx] = useState<{ hash: string; dollars: number; to: Member | null } | null>(null);
  const [details, setDetails] = useState(false);
  const [typing, setTyping] = useState(false); // "Custom": type the amount in a field (any device)
  const [intent, setIntent] = useState(false); // pressed Send before signing in: continue once signed in
  const [picked, setPicked] = useState<string | null>(null); // null = the whole team, else a person's name

  const team = venue?.team ?? [];
  const person = team.find((m) => m.name === picked) ?? null;
  const dollars = Number(entry) || 0;
  const valid = dollars >= 0.01 && Boolean(venue);
  const signingIn = intent && !address;
  const preparing = intent && Boolean(address); // signed in, about to carry on by itself
  const busy = phase === "minting" || phase === "approve" || phase === "confirm" || phase === "sending" || signingIn || preparing;
  const myFunds = funds && funds.of === address ? funds : null;
  const balance = myFunds ? toDollars(myFunds.ausd) : null;
  // Decided before the press, so the button always offers the right next step.
  const lowMon = Boolean(address && myFunds && myFunds.mon === BigInt(0));
  const lowAusd = Boolean(address && myFunds && !lowMon && myFunds.ausd < toUnits(dollars));

  // The venue, refreshed while the page is visible (the team or the rule can change at any time).
  useEffect(() => {
    let live = true;
    const read = () => {
      if (document.hidden) return;
      readVenue(id).then((v) => live && setVenue(v)).catch((e) => live && /No such venue|revert/i.test(String(e?.message)) && setMissing(true));
    };
    read();
    const t = setInterval(read, 20000);
    return () => { live = false; clearInterval(t); };
  }, [id]);
  useEffect(() => { if (venue) document.title = `Tip ${venue.name} · Weep`; }, [venue]);

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
    const t = setTimeout(() => setPressed(null), 160);
    return () => clearTimeout(t);
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

  /** The whole payment, once signed in: top up test dollars if short, allow this exact amount, send, wait for Monad. */
  const go = async () => {
    setMessage(null);
    if (!address || !wallet.send || !venue) return;
    if (!wallet.onMonad) { setMessage("Your wallet is on another network. Switch to Monad at the top, then send."); return; }
    const to = person;
    try {
      const f = myFunds ?? (await refreshFunds(address));
      if (f.mon === BigInt(0)) return; // the button now offers the faucet
      const units = toUnits(dollars);
      if (f.ausd < units) {
        setPhase("minting");
        const minted = await wallet.send({ to: AUSD, data: mintData(address, toUnits(TEST_DOLLARS)) });
        if (!(await waitForReceipt(minted))) throw new Error("Couldn't add test dollars. Nothing was sent.");
        await refreshFunds(address);
      }
      // Weep may move exactly this amount from your wallet into theirs, and nothing more.
      if ((await ausdAllowance(address, WEEP)) < units) {
        setPhase("approve");
        const ok = await wallet.send({ to: AUSD, data: approveData(WEEP, units) });
        if (!(await waitForReceipt(ok))) throw new Error("Couldn't allow the tip. Nothing was sent.");
      }
      setPhase("confirm");
      const hash = await wallet.send({ to: WEEP, data: to ? tipPersonData(venue.id, to.name, units) : tipTeamData(venue.id, units) });
      setPhase("sending");
      if (!(await waitForReceipt(hash))) throw new Error("The network turned the payment down. Nothing was sent.");
      setTx({ hash, dollars, to });
      setPhase("done");
      refreshFunds(address).catch(() => {});
      readVenue(venue.id).then(setVenue).catch(() => {});
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
    const t = setTimeout(() => { go().finally(() => setIntent(false)); }, 450);
    return () => clearTimeout(t);
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
  const pick = (name: string | null, el: HTMLElement) => {
    setPicked(name);
    setDetails(false);
    el.scrollIntoView({ inline: "nearest", block: "nearest", behavior: reduce ? "auto" : "smooth" });
  };

  if (missing) {
    return (
      <div className="pay">
        <div className="pay-card pay-done">
          <h1 className="pay-done-amount">Venue not found</h1>
          <p className="pay-done-sub">This link doesn&apos;t match a venue on Monad. Pick yours from the list.</p>
          <button type="button" className="btn-connect pay-again" onClick={() => openVenue(null)}>See all venues</button>
        </div>
      </div>
    );
  }

  const present = groupsIn(team);
  const shares = venue ? teamShares(venue.split, team, dollars) : null;
  const rule = venue ? teamShares(venue.split, team, 100) : null; // effective percentages for who's on the team
  const amount = usd(dollars, true);
  const label =
    phase === "minting" ? "Adding test dollars" :
    phase === "approve" ? "Allow the tip in your wallet" :
    phase === "confirm" ? "Confirm in your wallet" :
    phase === "sending" ? "Sending" :
    signingIn ? "Signing in" :
    preparing ? "Preparing your tip" :
    !venue ? "Finding the venue" :
    dollars < 0.01 ? "Enter an amount" :
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
                  (present.length ? present : GROUPS).map((g) => <span key={g.key} className="pay-face"><Image src={g.photo} alt="" fill sizes="32px" priority /></span>)
                )}
              </span>
              <span className="pay-to-text">
                <span className="pay-to-name">{person ? person.name : venue ? venue.name : <span className="balance-skeleton v-name-skeleton" />}</span>
                <span className="pay-status">
                  <span className="pay-live" aria-hidden />
                  {!venue ? "Reading the venue on Monad…" : person ? `${GROUPS[person.group].label} at ${venue.name} · gets all of it` : `${team.length} ${team.length === 1 ? "person" : "people"} · paid instantly`}
                </span>
              </span>
              <button type="button" className="pay-details-btn" aria-expanded={details} aria-controls="pay-details" onClick={() => setDetails((d) => !d)}>
                Details
              </button>
            </header>
            <AnimatePresence initial={false}>
              {details && (
                <motion.div id="pay-details" className="pay-details" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: reduce ? 0 : 0.24, ease: EASE }}>
                  <div className="pay-details-inner">
                    <p>{person
                      ? `All of your tip goes straight to ${person.name}'s wallet. No fee, no waiting.`
                      : "Your tip is split by the venue's own rule and lands in everyone's wallet the moment you send. No fee, nothing to claim."}</p>
                    <div className="pay-details-links">
                      <a href={`${EXPLORER}/address/${person ? person.wallet : WEEP}`} target="_blank" rel="noreferrer">{person ? "Their wallet" : "View on Monad"} <ArrowUpRight size={14} aria-hidden /></a>
                      <button type="button" onClick={() => openVenue(null)}>Another venue</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {team.length > 1 && (
              <div className="pay-people" role="radiogroup" aria-label="Who the tip is for">
                <button type="button" role="radio" aria-checked={!person} className="pay-person" disabled={busy} onClick={(e) => pick(null, e.currentTarget)}>Everyone</button>
                {team.map((m) => (
                  <button key={m.name} type="button" role="radio" aria-checked={person?.name === m.name} className="pay-person" disabled={busy} onClick={(e) => pick(m.name, e.currentTarget)}>
                    <span className="pay-person-face" aria-hidden><Image src={PHOTO[m.group]} alt="" fill sizes="26px" /></span>{m.name}
                  </button>
                ))}
              </div>
            )}

            {/* How much */}
            <h1 className="sr-only">{person ? `Leave a tip for ${person.name}` : venue ? `Leave a tip for the team at ${venue.name}` : "Leave a tip"}</h1>
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
                  <span className="pay-route-rule">{rule ? present.map((g) => `${Math.round(rule[g.key])}%`).join(" · ") : "…"}</span>
                </div>
                <div className="pay-bar" aria-hidden>
                  {(present.length ? present : GROUPS.map((g, i) => ({ ...g, i }))).map((g) => (
                    <motion.span key={g.key} className={`pay-seg pay-seg-${g.i}`} initial={false}
                      animate={{ flexGrow: rule ? rule[g.key] : 1 }} transition={{ duration: reduce ? 0 : 0.6, ease: EASE }} />
                  ))}
                </div>
                <ul className="pay-legend">
                  {(present.length ? present : GROUPS.map((g, i) => ({ ...g, i, count: 0 }))).map((g) => (
                    <li key={g.key}>
                      <span className="pay-legend-label"><span className={`pay-dot pay-seg-${g.i}`} aria-hidden />{g.label}{g.count > 1 && <span className="pay-legend-count">×{g.count}</span>}</span>
                      <Roll value={shares && dollars >= 0.01 ? usd(shares[g.key], true) : "—"} className="pay-legend-amount" />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* A keypad, so the amount is typed straight in */}
            <div className="pay-keypad" role="group" aria-label="Keypad">
              {KEYS.map((k) => (
                <button key={k} type="button" className={pressed?.key === k ? "pay-key is-pressed" : "pay-key"} disabled={busy} onClick={() => press(k)} aria-label={k === "del" ? "Delete" : k === "." ? "Decimal point" : k}>
                  {k === "del" ? <Delete size={22} aria-hidden /> : k}
                </button>
              ))}
            </div>

            {/* One action that carries the whole journey */}
            <button type="button" className={`pay-send${busy ? " is-busy" : ""}`} onClick={primary} disabled={!valid || busy} aria-busy={busy || undefined}>
              <span className="pay-send-progress" aria-hidden />
              <motion.span className="pay-send-fill" aria-hidden initial={false}
                animate={{ scaleX: phase === "sending" ? 0.92 : phase === "confirm" ? 0.5 : phase === "approve" || phase === "minting" ? 0.3 : preparing ? 0.22 : signingIn ? 0.1 : 0 }}
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
              {tx!.to ? `All of it is already in ${tx!.to.name}'s wallet.` : `Already in the team's wallets at ${venue?.name ?? "the venue"}, split by their rule.`}
            </p>

            <ul className="pay-done-split">
              {(tx!.to ? [{ key: "to", photo: PHOTO[tx!.to.group], label: tx!.to.name, amount: tx!.dollars }] : present.map((g) => ({ key: g.key, photo: g.photo, label: g.count > 1 ? `${g.label} ×${g.count}` : g.label, amount: teamShares(venue!.split, team, tx!.dollars)[g.key] })))
                .map((r, i) => (
                  <motion.li key={r.key} initial={{ opacity: 0, y: reduce ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.55 + i * 0.08, ease: EASE }}>
                    <span className="pay-done-photo"><Image src={r.photo} alt="" fill sizes="48px" /></span>
                    <span className="pay-done-share">+{usd(r.amount, true)}</span>
                    <span className="pay-done-label">{r.label}</span>
                  </motion.li>
                ))}
            </ul>

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
