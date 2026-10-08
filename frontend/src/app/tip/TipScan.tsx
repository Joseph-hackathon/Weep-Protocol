"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Camera } from "lucide-react";

/**
 * Tip (the individual's twin of the Customer page): scan someone's code, or paste their link, and land on
 * exactly what it points to: a business's tip card (which shows who it reaches) or a person's own link
 * (which opens Send on them). Nothing is chosen for you; the code decides.
 * Scanning uses the browser's own code reader where it has one; elsewhere the phone's camera app opens the
 * same page, and the page says so.
 */
type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (o: { formats: string[] }) => Detector;
const EASE = [0.2, 0.8, 0.2, 1] as const;
const FACES = ["/hero/barista.jpg", "/hero/chefs.jpg", "/hero/bartender.jpg"];
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const isWallet = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s.trim());
const noop = () => () => {};

/** A Weep page from a scanned or pasted value: a link to this site, or an email or wallet to pay. */
function destination(raw: string): string | null {
  const s = raw.trim();
  if (isEmail(s) || isWallet(s)) return `/send?to=${encodeURIComponent(s)}`;
  try {
    const u = new URL(s.includes("://") ? s : `https://${s}`);
    const sameSite = u.origin === window.location.origin || /(^|\.)weep-protocol\.vercel\.app$/.test(u.hostname);
    if (sameSite && /^\/(customer|send|merchant|money|employee)(\/|$)/.test(u.pathname)) return u.pathname + u.search;
  } catch {}
  return null;
}

export default function TipScan() {
  const reduce = useReducedMotion();
  const router = useRouter();
  const canScan = useSyncExternalStore(noop, () => "BarcodeDetector" in window && Boolean(navigator.mediaDevices?.getUserMedia), () => false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [bad, setBad] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setScanning(false);
  }, []);
  useEffect(() => stop, [stop]);

  const go = useCallback((raw: string) => {
    const to = destination(raw);
    if (!to) return false;
    stop();
    try { navigator.vibrate?.(12); } catch {}
    router.push(to);
    return true;
  }, [router, stop]);

  const scan = async () => {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      stream.current = s;
      setScanning(true);
      requestAnimationFrame(async () => {
        if (!video.current) return;
        video.current.srcObject = s;
        await video.current.play().catch(() => {});
        const Ctor = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
        const detector = new Ctor({ formats: ["qr_code"] });
        let busy = false;
        timer.current = window.setInterval(async () => {
          if (busy || !video.current || video.current.readyState < 2) return;
          busy = true;
          try {
            const found = await detector.detect(video.current);
            const value = found[0]?.rawValue;
            if (value && !go(value)) setError("That code isn't a Weep link.");
          } catch {}
          busy = false;
        }, 220);
      });
    } catch {
      stop();
      setError("The camera is blocked. Allow it in your browser, or scan with your camera app.");
    }
  };

  return (
    <div className="pay">
      <motion.div className="pay-card" initial={{ opacity: 0, y: reduce ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}>
        <header className="pay-to">
          <span className="pay-faces" aria-hidden>
            {FACES.map((src) => <span key={src} className="pay-face"><Image src={src} alt="" fill sizes="32px" priority /></span>)}
          </span>
          <span className="pay-to-text">
            <h1 className="pay-to-name">Tip</h1>
            <span className="pay-status"><span className="pay-live" aria-hidden />Scan their code to start</span>
          </span>
        </header>

        <div className={`t-finder${scanning ? " is-live" : ""}`}>
          <video ref={video} className="t-video" playsInline muted aria-hidden={!scanning} />
          <span className="t-corners" aria-hidden><i /><i /><i /><i /></span>
          {!scanning && (
            <span className="t-idle">
              <Camera size={28} aria-hidden />
              {canScan
                ? <button type="button" className="btn-connect t-scan" onClick={scan}>Scan a code</button>
                : <span className="t-hint">Point your phone&apos;s camera at their code. It opens their page here.</span>}
            </span>
          )}
          {scanning && <button type="button" className="t-stop" onClick={stop}>Stop</button>}
        </div>
        {error && <p className="m-error" role="alert">{error}</p>}

        <form className="t-paste" onSubmit={(e) => { e.preventDefault(); if (!go(link)) setBad(true); }}>
          <label className="sr-only" htmlFor="t-link">Their Weep link, email or wallet</label>
          <input id="t-link" className={`t-input${bad ? " is-bad" : ""}`} value={link} placeholder="Or paste their link"
            inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} onChange={(e) => { setLink(e.target.value); setBad(false); }} />
          <button type="submit" className="m-send t-go" disabled={!link.trim()} aria-label="Open"><ArrowRight size={18} strokeWidth={2.5} aria-hidden /></button>
        </form>
        {bad
          ? <p className="m-error" role="alert">That isn&apos;t a Weep link, an email or a wallet address.</p>
          : <p className="m-quiet">Each code opens its own page: a business shows who your tip reaches, a person opens Send.</p>}
      </motion.div>
    </div>
  );
}
