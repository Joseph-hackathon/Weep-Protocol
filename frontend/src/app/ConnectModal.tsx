"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Loader2, Mail, Search, X } from "lucide-react";
import { useLoginWithEmail } from "@privy-io/react-auth";
import { MONAD_CHAIN, connectDirect, useDirectWallets, type WalletInfo } from "./wallet-store";
import { readLastMethod, saveLastMethod, type LastMethod } from "./last-method";

type View = "start" | "code" | "wallet";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const enter = { duration: 0.24, ease: [0, 0, 0.38, 0.9] as const };   // motion-medium-2, entrance
const exit = { duration: 0.15, ease: [0.2, 0, 1, 0.9] as const };     // motion-medium-1, exit

type Props = {
  open: boolean;
  onClose: () => void;
  onAllWallets: () => void;
};

/**
 * Weep's sign-in: two ways in, email or a wallet. One title row (manual §8.4), one column,
 * one primary action. Desktop: a compact centred dialog. Phones: a bottom sheet.
 */
export default function ConnectModal({ open, onClose, onAllWallets }: Props) {
  const reduce = useReducedMotion();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false); // false on the server, true in the browser
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>("start");
  const [compact, setCompact] = useState(false);

  // Email
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const codeInput = useRef<HTMLInputElement>(null);

  // Wallets
  const { wallets } = useDirectWallets();
  const [pickedWallet, setPickedWallet] = useState<WalletInfo | null>(null);

  // Most recent sign-in in this browser, offered first
  const [last, setLast] = useState<LastMethod | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(true);

  // Compact window class (< 600px): bottom sheet instead of a centred dialog
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 599px)");
    const set = () => setCompact(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  // Fresh first step each time it opens
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView("start"); setError(null); setCode(""); setBusy(false); setPickedWallet(null);
    const m = readLastMethod();
    const usable = m && (m.type === "email" || m.type === "wallet" || m.type === "all") ? m : null;
    setLast(usable);
    if (usable?.type === "email") setEmail(usable.email);
    setShowEmailForm(usable?.type !== "email");
  }, [open]);

  // Focus: first control on open and on each step; Tab stays inside; Esc closes; page behind doesn't scroll
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab" || !dialog.current) return;
      const f = [...dialog.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), a[href]")];
      if (!f.length) return;
      const first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => dialog.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus(), 30);
    return () => clearTimeout(t);
  }, [view, open, showEmailForm]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const requestCode = async (e?: React.FormEvent, to?: string) => {
    e?.preventDefault();
    const address = (to ?? email).trim();
    if (!EMAIL_RE.test(address)) { setError("Enter an email address in the format name@example.com."); return; }
    setBusy(true); setError(null);
    try {
      await sendCode({ email: address });
      setEmail(address); setView("code"); setCode(""); setResendIn(30);
    } catch {
      setError("We couldn't send a code to that address. Check it and try again.");
    }
    setBusy(false);
  };

  const verify = async (value: string) => {
    setBusy(true); setError(null);
    try {
      await loginWithCode({ code: value });
      saveLastMethod({ type: "email", email: email.trim() });
      onClose();
    } catch {
      setError("That code didn't match. Check the latest email and try again.");
      setCode("");
      codeInput.current?.focus();
    }
    setBusy(false);
  };

  const onCodeChange = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    setError(null);
    if (digits.length === 6) void verify(digits);
  };

  const pickWallet = async (w: WalletInfo) => {
    setPickedWallet(w); setView("wallet"); setError(null); setBusy(true);
    try {
      await connectDirect(w.rdns, MONAD_CHAIN);
      saveLastMethod({ type: "wallet", rdns: w.rdns, name: w.name });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  // Last used: only offered if it's still possible here (a last wallet must still be installed)
  const lastWallet = last?.type === "wallet" ? wallets.find((w) => w.rdns === last.rdns) : undefined;
  const quick: { label: React.ReactNode; icon: React.ReactNode; run: () => void } | null =
    last?.type === "email" ? {
      label: last.email,
      icon: <Mail size={20} strokeWidth={1.75} aria-hidden />,
      run: () => void requestCode(undefined, last.email),
    }
    : last?.type === "all" ? { label: "Your wallet", icon: <Search size={20} strokeWidth={1.75} aria-hidden />, run: onAllWallets }
    : lastWallet ? {
        label: lastWallet.name,
        // eslint-disable-next-line @next/next/no-img-element -- data: URI announced by the wallet
        icon: <img src={lastWallet.icon} alt="" width={20} height={20} className="cm-quick-img" />,
        run: () => pickWallet(lastWallet),
      }
    : null;

  const title = view === "code" ? "Check your email"
    : view === "wallet" && pickedWallet ? `Open ${pickedWallet.name}`
    : quick ? "Welcome back" : "Sign in";

  const listedWallets = wallets.filter((w) => !(quick && w.rdns === lastWallet?.rdns));

  const panelMotion = compact
    ? { initial: reduce ? { opacity: 0 } : { y: "100%" }, animate: { y: 0, opacity: 1, transition: enter }, exit: { y: reduce ? 0 : "100%", opacity: reduce ? 0 : 1, transition: exit } }
    : { initial: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }, animate: { opacity: 1, scale: 1, y: 0, transition: enter }, exit: { opacity: 0, scale: reduce ? 1 : 0.98, transition: exit } };

  // Rendered at the top of the document, so no section's stacking can ever cover the dialog.
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="cm-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1, transition: enter }} exit={{ opacity: 0, transition: exit }}
          onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} className="cm-panel" {...panelMotion}>
            {compact && <span className="cm-grabber" aria-hidden />}

            {/* Title row: back (on later steps) · title · close */}
            <div className="cm-titlebar">
              {view !== "start" && (
                <button type="button" className="cm-icon" aria-label="Back" onClick={() => { setView("start"); setError(null); setBusy(false); }}>
                  <ArrowLeft size={20} strokeWidth={1.75} />
                </button>
              )}
              <h2 id={titleId} className="cm-title">{title}</h2>
              <button type="button" className="cm-icon cm-close" aria-label="Close" onClick={onClose}>
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>

            {view === "start" && (
              <div className="cm-body">
                {quick && (
                  <button type="button" data-autofocus={last?.type === "email" && showEmailForm ? undefined : true} className="cm-btn cm-btn-primary cm-quick" onClick={quick.run} disabled={busy} aria-label={`Continue with ${typeof quick.label === "string" ? quick.label : "last used"}, last used`}>
                    <span className="cm-quick-icon">{quick.icon}</span>
                    <span className="cm-quick-label">{quick.label}</span>
                    <span className="cm-quick-tag">Last used</span>
                  </button>
                )}
                {quick && error && last?.type === "email" && !showEmailForm && <p className="cm-error" role="alert">{error}</p>}

                {showEmailForm ? (
                  <form className="cm-email" onSubmit={requestCode} noValidate>
                    <label htmlFor="cm-email" className="cm-label">Email</label>
                    <input
                      id="cm-email"
                      data-autofocus={quick && !(last?.type === "email") ? undefined : true}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      className="cm-input"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      aria-invalid={!!error}
                      aria-describedby={error ? "cm-email-error" : undefined}
                    />
                    {error && <p id="cm-email-error" className="cm-error" role="alert">{error}</p>}
                    <button type="submit" className={`cm-btn ${quick ? "cm-btn-secondary" : "cm-btn-primary"}`} disabled={busy}>
                      {busy && <Loader2 size={16} className="cm-spin" aria-hidden />}
                      {busy ? "Sending code" : "Continue with email"}
                    </button>
                  </form>
                ) : (
                  <button type="button" className="cm-btn cm-btn-secondary" onClick={() => { setEmail(""); setError(null); setShowEmailForm(true); }}>
                    Use a different email
                  </button>
                )}

                <div className="cm-divider"><span>or</span></div>

                <ul className="cm-wallets" aria-label="Wallets">
                  {listedWallets.map((w) => (
                    <li key={w.rdns}>
                      <button type="button" className="cm-row" onClick={() => pickWallet(w)}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- wallet icons are data: URIs announced by the extension */}
                        <img src={w.icon} alt="" width={24} height={24} className="cm-row-icon" />
                        <span className="cm-row-name">{w.name}</span>
                        <span className="cm-tag">Installed</span>
                      </button>
                    </li>
                  ))}
                  <li>
                    <button type="button" className="cm-row" onClick={onAllWallets}>
                      <span className="cm-row-icon cm-row-glyph"><Search size={16} strokeWidth={2} aria-hidden /></span>
                      <span className="cm-row-name">{listedWallets.length ? "Other wallets" : "Connect a wallet"}</span>
                      <span className="cm-row-hint">600+</span>
                    </button>
                  </li>
                </ul>

                {/* New tab, so the sign-in in progress is never lost */}
                <p className="cm-legal">
                  By continuing, you agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms</a> and
                  confirm you&apos;ve read the <a href="/privacy" target="_blank" rel="noreferrer">Privacy notice</a>.
                </p>
              </div>
            )}

            {view === "code" && (
              <div className="cm-body">
                <p className="cm-sub">Enter the 6-digit code sent to <span className="cm-strong">{email.trim()}</span></p>
                <label htmlFor="cm-code" className="sr-only">6-digit code</label>
                <div className="cm-code" data-busy={busy} onClick={() => codeInput.current?.focus()}>
                  <input
                    id="cm-code"
                    ref={codeInput}
                    data-autofocus
                    className="cm-code-input"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={code}
                    onChange={(e) => onCodeChange(e.target.value)}
                    disabled={busy}
                    aria-invalid={!!error}
                    aria-describedby={error ? "cm-code-error" : undefined}
                  />
                  {Array.from({ length: 6 }, (_, i) => (
                    <span key={i} className="cm-cell" data-filled={i < code.length} data-active={!busy && i === Math.min(code.length, 5)} aria-hidden>
                      {code[i] ?? ""}
                    </span>
                  ))}
                </div>
                {busy && <p className="cm-status" role="status"><Loader2 size={16} className="cm-spin" aria-hidden /> Verifying</p>}
                {error && <p id="cm-code-error" className="cm-error" role="alert">{error}</p>}
                <div className="cm-links">
                  <button type="button" className="cm-link" disabled={resendIn > 0 || busy} onClick={() => requestCode()}>
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                  </button>
                  <span aria-hidden>·</span>
                  <button type="button" className="cm-link" onClick={() => { setView("start"); setError(null); setShowEmailForm(true); }}>Change email</button>
                </div>
              </div>
            )}

            {view === "wallet" && pickedWallet && (
              <div className="cm-body">
                <div className="cm-wallet-wait">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data: URI from the wallet */}
                  <img src={pickedWallet.icon} alt="" width={40} height={40} className="cm-wallet-hero" />
                  <p className="cm-sub">Approve the connection in {pickedWallet.name}. If it asks, allow the switch to Monad Testnet.</p>
                </div>
                {busy && <p className="cm-status" role="status"><Loader2 size={16} className="cm-spin" aria-hidden /> Waiting for approval</p>}
                {error && (
                  <>
                    <p className="cm-error" role="alert">{error}</p>
                    <button type="button" data-autofocus className="cm-btn cm-btn-primary" onClick={() => pickWallet(pickedWallet)}>Try again</button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
