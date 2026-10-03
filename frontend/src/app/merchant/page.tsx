import type { Metadata, Viewport } from "next";
import { BrandLink } from "../Brand";
import SiteFooter from "../SiteFooter";
import TeamSetup from "./TeamSetup";

export const metadata: Metadata = { title: "Merchant Portal · Weep" };
// resizes-content: on phones the page shrinks above the keyboard while the merchant types.
export const viewport: Viewport = { themeColor: "#040208", viewportFit: "cover", interactiveWidget: "resizes-content" };

/** Merchant space: set up the team and the tip rule in one prompt (DOCS.md §4.3). */
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
        <div className="page m-page">
          <TeamSetup />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
