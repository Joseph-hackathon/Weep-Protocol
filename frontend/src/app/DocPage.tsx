import Link from "next/link";
import { BrandLink } from "./Brand";
import SiteFooter from "./SiteFooter";

/**
 * The three public documents (Terms, Privacy, How money moves) share one quiet reading layout: the usual
 * header and footer, one readable column, the date and version up top, contents for the long ones, and links
 * to the other two at the end. The canonical text lives in these pages; the README links here.
 */
export const DOC_UPDATED = "8 October 2026";
export const DOC_VERSION = "1.0";
export const REPO = "https://github.com/Joseph-hackathon/Weep-Protocol";
/** Where people reach the team. One place, so it can be changed once. */
export const CONTACT = `${REPO}/issues`;

const DOCS = [
  { href: "/terms", title: "Terms of use" },
  { href: "/privacy", title: "Privacy notice" },
  { href: "/how-money-moves", title: "How money moves" },
] as const;

type Props = {
  path: (typeof DOCS)[number]["href"];
  title: string;
  lead: string;
  /** The short version, shown before everything else (a layered notice) */
  glance?: React.ReactNode[];
  contents?: { id: string; label: string }[];
  children: React.ReactNode;
};

export default function DocPage({ path, title, lead, glance, contents, children }: Props) {
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

      <main className="site-main">
        <div className="page doc">
          <article className="doc-article">
            <p className="doc-meta">Updated {DOC_UPDATED} · Version {DOC_VERSION}</p>
            <h1 className="doc-title">{title}</h1>
            <p className="doc-lead">{lead}</p>

            {glance && (
              <div className="doc-glance" role="note" aria-label="The short version">
                <p className="doc-glance-title">The short version</p>
                <ul>{glance.map((g, i) => <li key={i}>{g}</li>)}</ul>
              </div>
            )}

            {contents && (
              <details className="doc-contents">
                <summary>On this page</summary>
                <nav aria-label="On this page">
                  <ol>
                    {contents.map((c) => <li key={c.id}><a href={`#${c.id}`}>{c.label}</a></li>)}
                  </ol>
                </nav>
              </details>
            )}

            {children}

            <nav className="doc-more" aria-label="Weep documents">
              {DOCS.filter((d) => d.href !== path).map((d) => <Link key={d.href} href={d.href}>{d.title}</Link>)}
              <a href={REPO} target="_blank" rel="noreferrer">Source code</a>
            </nav>
          </article>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
