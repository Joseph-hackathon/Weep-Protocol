import type { Metadata, Viewport } from "next";
import { BrandLink } from "../Brand";
import SiteFooter from "../SiteFooter";
import TipsHome from "./TipsHome";

export const metadata: Metadata = { title: "Your tips · Weep" };
export const viewport: Viewport = { themeColor: "#040208", viewportFit: "cover" };

/** Employee space: sign in with email and see tips arrive, live (DOCS.md §4.2). */
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
          <TipsHome />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
