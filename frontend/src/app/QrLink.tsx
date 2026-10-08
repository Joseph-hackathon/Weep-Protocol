"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";

const noop = () => () => {};
/** Long wallet addresses are shortened on screen only; the link and the QR code carry them in full. */
const shown = (link: string) => link.replace(/^https?:\/\//, "").replace(/0x[0-9a-fA-F]{40}/g, (a) => `${a.slice(0, 6)}…${a.slice(-4)}`);

/**
 * A Weep link as a QR code: the code, the link on one line, anything that edits the link (`children`), and one
 * even row of actions (share where the device can, copy, save a print-ready image).
 * `path` is the page and its address part, e.g. `/send?to=0x…&name=Sam`.
 */
export default function QrLink({ path, name, label, children }: { path: string; name: string; label: string; children?: ReactNode }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const canShare = useSyncExternalStore(noop, () => typeof navigator.share === "function", () => false);
  const link = origin + path;
  useEffect(() => {
    if (!origin) return;
    let live = true;
    import("qrcode").then((QR) => QR.toString(link, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0d0b14", light: "#ffffff" } }))
      .then((s) => live && setSvg(s)).catch(() => {});
    return () => { live = false; };
  }, [link, origin]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const share = () => { navigator.share?.({ title: `Pay ${name} · Weep`, url: link }).catch(() => {}); };
  const download = async () => {
    const QR = await import("qrcode");
    const url = await QR.toDataURL(link, { width: 1024, margin: 2, errorCorrectionLevel: "M" });
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "weep"}-qr.png`;
    a.click();
  };
  return (
    <section className="q-card" aria-label={label}>
      <div className="q-main">
        <span className="q-code" role="img" aria-label={`QR code for ${link}`} dangerouslySetInnerHTML={svg ? { __html: svg } : undefined} />
        <div className="q-side">
          <p className="q-label">{label}</p>
          <p className="q-link" title={link}>{shown(link)}</p>
          {children}
        </div>
      </div>
      <div className={`q-actions${canShare ? "" : " is-two"}`}>
        {canShare && <button type="button" onClick={share}><Share2 size={16} aria-hidden />Share</button>}
        <button type="button" onClick={copy}>{copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}{copied ? "Copied" : <><span className="q-long">Copy link</span><span className="q-short">Copy</span></>}</button>
        <button type="button" onClick={download}><Download size={16} aria-hidden /><span className="q-long">Save QR</span><span className="q-short">Save</span></button>
      </div>
    </section>
  );
}
