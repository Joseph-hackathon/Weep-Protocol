import type { Viewport } from "next";
import { BrandLink } from "./Brand";
import SiteFooter from "./SiteFooter";
import Hero from "./Hero";

// Phone browser bars take the page's colour, and the background runs under the notch.
export const viewport: Viewport = { themeColor: "#040208", viewportFit: "cover" };

export default function Home() {
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
        <Hero />
      </main>

      <SiteFooter legal />
    </>
  );
}
