import Link from "next/link";
import { BrandLink } from "./Brand";
import SiteFooter from "./SiteFooter";

/** Unknown addresses keep the same header and logo, and offer one clear way home (manual §9.5). */
export default function NotFound() {
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

      <main className="page nf">
        <h1 className="nf-title">This page doesn&apos;t exist</h1>
        <p className="nf-sub">The link may be old or mistyped.</p>
        <Link href="/" className="btn-connect nf-home">Back to Weep</Link>
      </main>

      <SiteFooter />
    </>
  );
}
