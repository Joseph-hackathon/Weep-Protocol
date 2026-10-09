"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { encodeFunctionData, parseAbi } from "viem";
import { ArrowUp, ArrowUpRight, Check, ChevronLeft, Minus, Plus, X } from "lucide-react";
import { requestConnect, useWallet } from "../wallet-bridge";
import { EXPLORER, FAUCET, WEEP_POOLS, ausdBalance, call, poolOf, predictPool, readPolicy, readTeam, toDollars, waitForReceipt } from "../chain";
import { POLICY_REGISTRY, descriptionHash, readAttestation, type Attestation } from "../attestation";
import { setupMessage } from "../setup-message";
import { ensureGas } from "../gas";
import { poolLink } from "../pool-link";
import QrLink from "../QrLink";

/**
 * Merchant one-prompt setup (co-founder's architecture):
 *   1 Describe — the team, emails, roles and the tip rule, in plain words, in one box
 *   2 Review   — Gemini's reading as a table the merchant can correct before anything is saved
 *   3 Save     — Privy pre-generates a wallet per email; then one confirmation creates the business's own pool
 *                (WeepPools) with the rule and the team, or updates the pool it already has
 *   4 Live     — the team is ready; customers can tip the team or a person, and the business pays the pool out
 * Every business gets its own pool, owned by the wallet that set it up. Signing in with a wallet that already has
 * a pool lands straight on Live. The first network fee of an email sign-in is covered by Weep.
 */
type Group = "floor" | "kitchen" | "bar";
type Person = { name: string; email: string; group: Group; wallet?: string | null };
type Pool = { foh: number; boh: number; bar: number };
type Stage = "describe" | "review" | "save" | "live";
type StepState = "idle" | "working" | "done" | "error";

const GROUPS: { key: Group; label: string; pool: keyof Pool }[] = [
  { key: "floor", label: "Floor", pool: "foh" },
  { key: "kitchen", label: "Kitchen", pool: "boh" },
  { key: "bar", label: "Bar", pool: "bar" },
];
const abi = parseAbi([
  "function create(uint256 foh, uint256 boh, uint256 bar, string[] names, address[] wallets, uint8[] groups) returns (address)",
  "function configure(uint256 foh, uint256 boh, uint256 bar, string[] names, address[] wallets, uint8[] groups)",
  "function payoutTeam()",
  "function pendingTips() view returns (uint256)",
]);
const GROUP_INDEX: Record<Group, number> = { floor: 0, kitchen: 1, bar: 2 };
const GROUP_KEYS: Group[] = ["floor", "kitchen", "bar"];
const usd = (d: number) => `$${d.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const EASE = [0.2, 0.8, 0.2, 1] as const;
const FACES = ["/hero/barista.jpg", "/hero/chefs.jpg", "/hero/bartender.jpg"];
const NEXT_GROUP: Record<Group, Group> = { floor: "kitchen", kitchen: "bar", bar: "floor" };
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
const rejected = (e: unknown) => /reject|denied|cancel/i.test(String((e as { message?: string })?.message ?? e)) || (e as { code?: number })?.code === 4001;

/** Team tips waiting in a pool; a pool can't change its team or split until they're paid out. Older pools: 0. */
const pendingTips = (pool: string) =>
  call(pool, encodeFunctionData({ abi, functionName: "pendingTips" })).then(BigInt).catch(() => BigInt(0));
const PAY_OUT_FIRST = "Tips are waiting in your pool. Pay them out to the team by your current split first, then change the team.";

const PARSE_ERRORS: Record<string, string> = {
  "not-configured": "The setup assistant isn't switched on yet. It needs the Gemini key on the server.",
  "ai-failed": "Couldn't read that just now. Try again, or write it a little more simply.",
  "too-long": "That's a lot of text. Keep it under 4,000 characters.",
  empty: "Write a few lines about your team first.",
};
const WALLET_ERRORS: Record<string, string> = {
  "not-configured": "Wallet creation isn't switched on yet. It needs the Privy app secret on the server.",
  "not-owner": "This wallet doesn't run that pool. Connect the wallet that set it up.",
  "bad-signature": "The signature didn't match this wallet. Try again.",
  expired: "That approval expired. Try again.",
  "bad-emails": "Every person needs a valid email address.",
};

export default function TeamSetup() {
  const reduce = useReducedMotion();
  const wallet = useWallet();
  const address = wallet.address?.toLowerCase() ?? null;

  const [stage, setStage] = useState<Stage>("describe");
  const [text, setText] = useState("");
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [pool, setPool] = useState<Pool>({ foh: 60, boh: 30, bar: 10 });
  const [notes, setNotes] = useState<string[]>([]);
  const [poolAt, setPoolAt] = useState<string | null>(null); // this business's own pool, once it exists
  const [steps, setSteps] = useState<{ wallets: StepState; pool: StepState }>({ wallets: "idle", pool: "idle" });
  const [running, setRunning] = useState(false);
  const [fromChain, setFromChain] = useState(false); // opened with a team already saved on Monad
  const [waiting, setWaiting] = useState<number | null>(null); // dollars in the pool, ready to pay out
  const [payout, setPayout] = useState<{ state: "idle" | "confirm" | "sending" | "done"; hash?: string; dollars?: number; error?: string }>({ state: "idle" });
  const [attested, setAttested] = useState<Attestation | null>(null); // Chainlink CRE's signed read of this exact description

  // Signed in: find this business's own pool. If it has one with a team, show it instead of an empty form.
  useEffect(() => {
    if (!address) return;
    let live = true;
    poolOf(address).then(async (p) => {
      if (!live) return;
      setPoolAt(p);
      if (!p) return;
      const [team, rule] = await Promise.all([readTeam(p), readPolicy(p)]);
      if (!live || team.length === 0) return;
      setStage((s) => (s === "describe" ? "live" : s));
      setFromChain(true);
      setPeople(team.map((m) => ({ name: m.name, email: "", group: GROUP_KEYS[m.group], wallet: m.wallet })));
      setPool(rule);
      setSteps({ wallets: "done", pool: "done" });
    }).catch(() => {});
    return () => { live = false; };
  }, [address]);

  // The pool's balance while the team is live, so the business can pay it out.
  useEffect(() => {
    if (stage !== "live" || !poolAt) return;
    let live = true;
    const read = () => { if (!document.hidden) ausdBalance(poolAt).then((b) => live && setWaiting(toDollars(b))).catch(() => {}); };
    read();
    const id = setInterval(read, 8000);
    document.addEventListener("visibilitychange", read);
    return () => { live = false; clearInterval(id); document.removeEventListener("visibilitychange", read); };
  }, [stage, poolAt]);

  // Reviewing: has Weep's Chainlink CRE workflow attested this exact description for this business's pool?
  useEffect(() => {
    setAttested(null);
    if (stage !== "review" || !address || !POLICY_REGISTRY) return;
    let live = true;
    (async () => {
      const a = await readAttestation(poolAt ?? (await predictPool(address)));
      if (live && a && a.descriptionHash === descriptionHash(text)) setAttested(a);
    })().catch(() => {});
    return () => { live = false; };
  }, [stage, address, poolAt, text]);

  const total = pool.foh + pool.boh + pool.bar;
  // Shown only while the review still matches what CRE attested; any edit makes it the business's own version.
  const matchesCre = !!attested && attested.foh === pool.foh && attested.boh === pool.boh && attested.bar === pool.bar
    && attested.names.length === people.length
    && people.every((p, i) => p.name.trim() === attested.names[i] && GROUP_INDEX[p.group] === attested.groups[i]);
  const emailsOk = people.every((p) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email) && p.name.trim());
  // Customers tip a person by name, so two people can't share one.
  const namesOk = new Set(people.map((p) => p.name.trim().toLowerCase())).size === people.length;
  const reviewOk = people.length > 0 && total === 100 && emailsOk && namesOk;

  const read = async () => {
    setError(null);
    setReading(true);
    try {
      const res = await fetch("/api/setup/parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await res.json();
      if (!res.ok) { setError(PARSE_ERRORS[data.error] ?? PARSE_ERRORS["ai-failed"]); return; }
      setPeople(data.employees);
      setPool(data.pool);
      setNotes(data.notes ?? []);
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
    setError(null);
    setRunning(true);
    let team = people;
    try {
      // Waiting team tips go out by the rules they arrived under, so the pool refuses a change until then.
      if (poolAt && (await pendingTips(poolAt)) > BigInt(0)) throw new Error(PAY_OUT_FIRST);

      // The pool these wallets are for: this business's own, or where it's about to be created
      const target = poolAt ?? (await predictPool(address));

      // 1 · Wallets for everyone (Privy pre-generation), approved by the business's signature
      if (steps.wallets !== "done") {
        setSteps((s) => ({ ...s, wallets: "working" }));
        const emails = team.map((p) => p.email.toLowerCase());
        const issuedAt = new Date().toISOString();
        const signature = await wallet.sign(setupMessage(emails, issuedAt, target));
        const res = await fetch("/api/setup/wallets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ emails, issuedAt, signer: wallet.address, signature, pool: target }) });
        const data = await res.json();
        if (!res.ok) throw new Error(WALLET_ERRORS[data.error] ?? "Couldn't create the wallets. Try again.");
        const byEmail = new Map<string, string | null>(data.wallets.map((w: { email: string; wallet: string | null }) => [w.email, w.wallet]));
        team = team.map((p) => ({ ...p, wallet: byEmail.get(p.email.toLowerCase()) ?? null }));
        setPeople(team);
        if (team.some((p) => !p.wallet)) throw new Error("Some wallets couldn't be created. Try again.");
        setSteps((s) => ({ ...s, wallets: "done" }));
      }

      // 2 · The pool, the split and the team, in one confirmation: created the first time, updated after that
      setSteps((s) => ({ ...s, pool: "working" }));
      if (!(await ensureGas(wallet))) {
        window.open(FAUCET, "_blank", "noopener");
        throw new Error("Saving needs a little MON for the network fee. Get some free from the faucet, then try again.");
      }
      const names = team.map((p) => p.name.trim());
      const wallets = team.map((p) => p.wallet as `0x${string}`);
      const groups = team.map((p) => GROUP_INDEX[p.group]);
      const split = [BigInt(pool.foh), BigInt(pool.boh), BigInt(pool.bar)] as const;
      const hash = poolAt
        ? await wallet.send({ to: poolAt as `0x${string}`, data: encodeFunctionData({ abi, functionName: "configure", args: [...split, names, wallets, groups] }) })
        : await wallet.send({ to: WEEP_POOLS, data: encodeFunctionData({ abi, functionName: "create", args: [...split, names, wallets, groups] }) });
      if (!(await waitForReceipt(hash))) throw new Error("Monad turned it down. Check every name is different and the split adds up to 100.");
      const mine = poolAt ?? (await poolOf(address));
      setPoolAt(mine);
      setSteps((s) => ({ ...s, pool: "done" }));

      try { localStorage.setItem("weep.team", JSON.stringify({ pool: mine, people: team, split: pool, savedAt: Date.now() })); } catch {}
      setStage("live");
    } catch (e) {
      setSteps((s) => ({
        wallets: s.wallets === "working" ? "error" : s.wallets,
        pool: s.pool === "working" ? "error" : s.pool,
      }));
      setError(rejected(e) ? "Cancelled in your wallet. Nothing more was saved." : (e as Error)?.message || "Something went wrong.");
    } finally {
      setRunning(false);
    }
  };

  const restart = () => {
    setStage("describe"); setPeople([]); setNotes([]); setError(null); setFromChain(false); setPayout({ state: "idle" });
    setSteps({ wallets: "idle", pool: "idle" });
  };

  /** Changing the team waits until tips already in the pool are paid out by the current split. */
  const changeTeam = async () => {
    if (poolAt && (await pendingTips(poolAt)) > BigInt(0)) { setPayout((p) => ({ ...p, state: "idle", error: PAY_OUT_FIRST })); return; }
    restart();
  };

  /** Pay everything waiting in the pool to the saved team, by the saved split. */
  const payOut = async () => {
    if (!address || !wallet.send) { requestConnect(); return; }
    if (!poolAt) return;
    const dollars = waiting ?? 0;
    setPayout({ state: "confirm" });
    try {
      if (!(await ensureGas(wallet))) { window.open(FAUCET, "_blank", "noopener"); throw new Error("Paying out needs a little MON for the network fee. Get some free from the faucet, then try again."); }
      const hash = await wallet.send({ to: poolAt as `0x${string}`, data: encodeFunctionData({ abi, functionName: "payoutTeam" }) });
      setPayout({ state: "sending" });
      if (!(await waitForReceipt(hash))) throw new Error("Monad turned the payout down. Nothing moved.");
      setPayout({ state: "done", hash, dollars });
      ausdBalance(poolAt).then((b) => setWaiting(toDollars(b))).catch(() => {});
    } catch (e) {
      setPayout({ state: "idle", error: rejected(e) ? "Cancelled in your wallet. Nothing moved." : (e as Error)?.message || "Something went wrong. Nothing moved." });
    }
  };
  const paying = payout.state === "confirm" || payout.state === "sending";

  const fade = { initial: { opacity: 0, y: reduce ? 0 : 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: reduce ? 0 : -8 }, transition: { duration: reduce ? 0 : 0.26, ease: EASE } };

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
            {header("Your team", "Set up in one message")}
            <h1 className="m-ask">Who works with you, and how should tips be shared?</h1>
            <div className={`m-composer${reading ? " is-busy" : ""}`}>
              <label className="sr-only" htmlFor="m-text">Your team and tip rule</label>
              <textarea
                id="m-text" className="m-input" rows={6} value={text} maxLength={4000} disabled={reading}
                placeholder="Names, emails, who works the floor, kitchen or bar, and how team tips split."
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
            {header("Your team", `${people.length} ${people.length === 1 ? "person" : "people"}`, () => setStage("describe"))}

            {notes.length > 0 && <p className="m-note">{notes.join(" ")}</p>}

            <ul className="m-people">
              {people.map((p, i) => (
                <li key={i} className="m-person">
                  <span className={`m-avatar m-avatar-${p.group}`} aria-hidden>{initials(p.name) || "?"}</span>
                  <span className="m-person-text">
                    <span className="m-person-name">{p.name}</span>
                    <span className={p.email ? "m-person-email" : "m-person-email is-missing"}>{p.email || "Needs an email"}</span>
                  </span>
                  <button type="button" className={`m-role m-role-${p.group}`} aria-label={`${p.name}: ${p.group}. Tap to change`}
                    onClick={() => setPeople((list) => list.map((x, j) => (j === i ? { ...x, group: NEXT_GROUP[x.group] } : x)))}>
                    {GROUPS.find((g) => g.key === p.group)?.label}
                  </button>
                  <button type="button" className="m-remove" aria-label={`Remove ${p.name}`} onClick={() => setPeople((list) => list.filter((_, j) => j !== i))}><X size={14} /></button>
                </li>
              ))}
            </ul>

            <section className="pay-route" aria-label="How team tips are split">
              <div className="pay-route-head">
                <span>Split</span>
                <span className={total === 100 ? "pay-route-rule" : "pay-route-rule m-off"}>{total === 100 ? `${pool.foh}% · ${pool.boh}% · ${pool.bar}%` : `${total}% of 100%`}</span>
              </div>
              <div className="pay-bar" aria-hidden>
                {GROUPS.map((g, i) => (
                  <motion.span key={g.key} className={`pay-seg pay-seg-${i}`} initial={false} animate={{ flexGrow: pool[g.pool] || 0.0001 }} transition={{ duration: reduce ? 0 : 0.4, ease: EASE }} />
                ))}
              </div>
              <ul className="pay-legend">
                {GROUPS.map((g, i) => (
                  <li key={g.key}>
                    <span className="pay-legend-label"><span className={`pay-dot pay-seg-${i}`} aria-hidden />{g.label}</span>
                    <span className="m-stepper">
                      <button type="button" aria-label={`Less to ${g.label}`} onClick={() => setPool((p) => ({ ...p, [g.pool]: Math.max(0, p[g.pool] - 5) }))}><Minus size={12} /></button>
                      <output aria-live="polite">{pool[g.pool]}%</output>
                      <button type="button" aria-label={`More to ${g.label}`} onClick={() => setPool((p) => ({ ...p, [g.pool]: Math.min(100, p[g.pool] + 5) }))}><Plus size={12} /></button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <button type="button" className="pay-send" onClick={() => setStage("save")} disabled={!reviewOk}>
              <span className="pay-send-label"><span>{reviewOk ? "Save team" : people.length === 0 ? "Add someone first" : total !== 100 ? "Make the split 100%" : !emailsOk ? "Everyone needs an email" : "Give everyone a different name"}</span></span>
            </button>
            <p className="m-quiet">Tips to a named person go 100% to them.</p>
            {matchesCre && (
              <a className="m-cre" href={`${EXPLORER}/address/${POLICY_REGISTRY}`} target="_blank" rel="noreferrer">
                Read by Chainlink CRE · attested on Monad <ArrowUpRight size={12} aria-hidden />
              </a>
            )}
          </motion.div>
        )}

        {/* 3 · Save */}
        {stage === "save" && (
          <motion.div key="save" className="pay-card" {...fade}>
            {header("Saving your team", running ? "Confirm in your wallet when asked" : `${people.length} ${people.length === 1 ? "person" : "people"} · ${pool.foh}/${pool.boh}/${pool.bar}`, () => setStage("review"))}

            <ul className="m-progress">
              <Step state={steps.wallets} title={`Wallets for ${people.length} ${people.length === 1 ? "person" : "people"}`}
                detail={steps.wallets === "done" ? "Ready" : "One signature"} />
              <Step state={steps.pool} title={poolAt ? "Your pool: split and team" : "Your own pool, split and team"}
                detail={steps.pool === "done" ? "Saved on Monad" : "One confirmation"} />
            </ul>

            {steps.wallets === "done" && (
              <ul className="m-wallets">
                {people.map((p, i) => (
                  <li key={i}><span className={`m-avatar m-avatar-${p.group}`} aria-hidden>{initials(p.name)}</span><span className="m-person-name">{p.name}</span><span className="m-wallet">{p.wallet ? short(p.wallet) : "—"}</span></li>
                ))}
              </ul>
            )}

            {address && !wallet.onMonad ? <p className="m-warn">Your wallet is on another network. Switch to Monad at the top.</p> : null}

            <button type="button" className={`pay-send${running ? " is-busy" : ""}`} onClick={save}
              disabled={running || (Boolean(address) && !wallet.onMonad)} aria-busy={running || undefined}>
              <span className="pay-send-progress" aria-hidden />
              <motion.span className="pay-send-fill" aria-hidden initial={false}
                animate={{ scaleX: [steps.wallets, steps.pool].filter((x) => x === "done").length / 2 }}
                transition={{ duration: reduce ? 0 : 0.5, ease: EASE }} />
              <span className="pay-send-label"><span>
                {running ? <>Saving<span className="pay-ellipsis" aria-hidden /></> : !address ? "Connect to save" : error ? "Try again" : "Save"}
              </span></span>
            </button>
            {error && <p className="m-error" role="alert">{error}</p>}
          </motion.div>
        )}

        {/* 4 · Live */}
        {stage === "live" && (
          <motion.div key="live" className="pay-card pay-done" {...fade}>
            <svg className="pay-check" viewBox="0 0 64 64" aria-hidden>
              <motion.circle cx="32" cy="32" r="29" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.5, ease: EASE }} />
              <motion.path d="M20 33 l8 8 l16 -18" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.4, ease: EASE }} />
            </svg>
            <h1 className="pay-done-amount">{fromChain ? "Your team" : "Your team is live"}</h1>
            <p className="pay-done-sub">{`Split ${pool.foh}% · ${pool.boh}% · ${pool.bar}%. Customers can tip the team or anyone by name.`}</p>
            <ul className="m-wallets">
              {people.map((p, i) => (
                <li key={i}>
                  <span className={`m-avatar m-avatar-${p.group}`} aria-hidden>{initials(p.name)}</span>
                  <span className="m-person-name">{p.name}</span>
                  {p.wallet && <a className="m-wallet" href={`${EXPLORER}/address/${p.wallet}`} target="_blank" rel="noreferrer">{short(p.wallet)} <ArrowUpRight size={12} aria-hidden /></a>}
                </li>
              ))}
            </ul>

            {poolAt && (
              <section className="m-payout" aria-label="Pay out the pool">
                <div className="m-payout-head">
                  <span className="m-payout-label"><span className="pay-live" aria-hidden />Waiting in the pool</span>
                  <span className="m-payout-amount">{waiting === null ? "…" : usd(waiting)}</span>
                </div>
                {payout.state === "done" ? (
                  <p className="m-payout-done">
                    Paid {usd(payout.dollars ?? 0)} to the team.{" "}
                    <a href={`${EXPLORER}/tx/${payout.hash}`} target="_blank" rel="noreferrer">Receipt <ArrowUpRight size={12} aria-hidden /></a>
                  </p>
                ) : waiting !== null && waiting > 0 ? (
                  <>
                    <button type="button" className={`pay-send${paying ? " is-busy" : ""}`} onClick={payOut}
                      disabled={paying || (Boolean(address) && !wallet.onMonad)} aria-busy={paying || undefined}>
                      <span className="pay-send-label"><span>
                        {payout.state === "confirm" ? <>Confirm in your wallet<span className="pay-ellipsis" aria-hidden /></>
                          : payout.state === "sending" ? <>Paying out<span className="pay-ellipsis" aria-hidden /></>
                          : !address ? "Connect to pay out" : `Pay ${usd(waiting)} to the team`}
                      </span></span>
                    </button>
                    {payout.error && <p className="m-error" role="alert">{payout.error}</p>}
                  </>
                ) : (
                  <p className="m-quiet">New team tips gather here. You, or anyone, can pay them out to the team by the split.</p>
                )}
              </section>
            )}

            {/* The code for the tables: what a customer scans (or an individual scans from Tip) to tip this team. */}
            {poolAt && <QrLink path={poolLink(poolAt)} name="team-tips" label="Your tip code for the tables" />}

            {poolAt && <Link href={poolLink(poolAt)} className="pay-again m-link">See what customers see</Link>}
            <button type="button" className="m-text-btn" onClick={changeTeam}>{fromChain ? "Change the team" : "Start over"}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
