import type { Metadata, Viewport } from "next";
import { BrandLink } from "../Brand";
import SiteFooter from "../SiteFooter";
import MoneyHome from "./MoneyHome";

export const metadata: Metadata = { title: "My money · Weep" };
export const viewport: Viewport = { themeColor: "#040208", viewportFit: "cover" };

/** My money: everything you have received, from whom and when, and your own link to get paid. */
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
          <MoneyHome />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
