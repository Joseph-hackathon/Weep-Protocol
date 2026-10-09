import { ImageResponse } from "next/og";

/** The card a shared link shows (Open Graph and X): Weep's line on its dark canvas. */
export const alt = "Weep: pay a whole group at once, to the exact cent, on Monad.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 80px", background: "radial-gradient(ellipse at 50% 120%, #2a1a5e 0%, #08040f 55%, #030207 100%)", color: "#f3f0ff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>
          <div style={{ width: 20, height: 20, borderRadius: 999, background: "#a2e980" }} />
          Weep
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 96, fontWeight: 600, letterSpacing: -3, lineHeight: 1.05 }}>Gratitude, onchain.</div>
          <div style={{ fontSize: 38, color: "rgba(243,240,255,0.72)", lineHeight: 1.3, maxWidth: 940 }}>Pay a whole group at once, to the exact cent. Everyone is paid in one Monad transaction.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "rgba(243,240,255,0.5)" }}>
          <span>weep-protocol.vercel.app</span>
          <span>@WeepProtocol · Monad testnet</span>
        </div>
      </div>
    ),
    size,
  );
}
