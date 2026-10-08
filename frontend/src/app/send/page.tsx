import type { Metadata, Viewport } from "next";
import { BrandLink } from "../Brand";
import SiteFooter from "../SiteFooter";
import SendFlow from "./SendFlow";

export const metadata: Metadata = { title: "Send · Weep" };
// resizes-content: on phones the page shrinks above the keyboard while names and amounts are typed.
export const viewport: Viewport = { themeColor: "#040208", viewportFit: "cover", interactiveWidget: "resizes-content" };

/** Send: say who gets what, check the exact amounts, pay everyone in one go. */
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
          <SendFlow />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
