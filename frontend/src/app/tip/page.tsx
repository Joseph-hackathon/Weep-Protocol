import type { Metadata, Viewport } from "next";
import { BrandLink } from "../Brand";
import SiteFooter from "../SiteFooter";
import TipScan from "./TipScan";

export const metadata: Metadata = { title: "Tip · Weep" };
export const viewport: Viewport = { themeColor: "#040208", viewportFit: "cover" };

/** Tip: scan a code or paste a link, and land exactly where it points. */
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
        <div className="page m-page i-page">
          <TipScan />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
