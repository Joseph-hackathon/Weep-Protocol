import type { Metadata, Viewport } from "next";
import { BrandLink } from "../Brand";
import SiteFooter from "../SiteFooter";
import TipFlow from "./TipFlow";

export const metadata: Metadata = { title: "Leave a tip · Weep" };
// resizes-content: if a phone keyboard ever opens, the page shrinks above it instead of being covered.
export const viewport: Viewport = { themeColor: "#040208", viewportFit: "cover", interactiveWidget: "resizes-content" };

/** Customer space: where a table QR code or a tip link lands. */
export default function Page() {
  return (
    <>
      <div className="void" aria-hidden>
        <div className="void-glow void-glow-a" />
        <div className="void-glow void-glow-b" />
        <div className="void-glow void-glow-c" />
        <div className="void-grain" />
      </div>

      <header className="site-header">
        <div className="page site-header-row">
          <BrandLink priority />
        </div>
      </header>

      <main className="site-main hero">
        <div className="page tip-page">
          <TipFlow />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
