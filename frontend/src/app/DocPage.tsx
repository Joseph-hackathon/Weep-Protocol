import { Children, isValidElement } from "react";
import Link from "next/link";
import { BrandLink } from "./Brand";
import SiteFooter from "./SiteFooter";
import DocSpy from "./DocSpy";

/**
 * The three public documents (Terms, Privacy, How money moves): one open reading column (640px, 60–75ch).
 * The chooser's pill switch moves between them; the short version comes first; then numbered contents and every
 * section in full. On wide screens the contents become a side rail that stays in view and marks where you are.
 * The canonical text lives in these pages; the README links here.
 */
export const DOC_UPDATED = "9 October 2026";
export const DOC_VERSION = "1.2";
export const REPO = "https://github.com/Joseph-hackathon/Weep-Protocol";
/** Where people reach the team. One place, so it can be changed once. */
export const CONTACT = `${REPO}/issues`;

const DOCS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/how-money-moves", label: "Money" },
] as const;

type PartProps = { id: string; title: string; children: React.ReactNode };

/** One numbered section of a document. DocPage lays it out and lists it in the contents. */
export function Part(props: PartProps) {
  void props;
  return null;
}

type Props = {
  path: (typeof DOCS)[number]["href"];
  title: string;
  lead: string;
  /** The short version, shown first (a layered notice): a few plain statements, each with one line of detail */
  glance: { title: string; text: string }[];
  children: React.ReactNode;
};

export default function DocPage({ path, title, lead, glance, children }: Props) {
  const parts = Children.toArray(children).filter(isValidElement).map((c) => c.props as PartProps);
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
          <article className="doc-layout">
            <header className="doc-head">
              <nav className="side-switch doc-switch" aria-label="Weep documents">
                {DOCS.map((d) => (
                  <Link key={d.href} href={d.href} className="side-option" aria-current={d.href === path ? "page" : undefined}>
                    {d.href === path && <span className="side-thumb" aria-hidden />}
                    <span className="side-label">{d.label}</span>
                  </Link>
                ))}
              </nav>
              <h1 className="doc-title">{title}</h1>
              <p className="doc-date">Effective {DOC_UPDATED} · Version {DOC_VERSION}</p>
              <p className="doc-lead">{lead}</p>
            </header>

            <section className="doc-glance" aria-labelledby="doc-glance-label">
              <p id="doc-glance-label" className="doc-label">The short version</p>
              <ul>
                {glance.map((g) => (
                  <li key={g.title}><strong>{g.title}</strong><span>{g.text}</span></li>
                ))}
              </ul>
            </section>

            <nav className="doc-contents" aria-labelledby="doc-contents-label">
              <p id="doc-contents-label" className="doc-label">Contents</p>
              <ol>
                {parts.map((p, i) => (
                  <li key={p.id}><a href={`#${p.id}`}><span className="doc-num">{i + 1}</span>{p.title}</a></li>
                ))}
              </ol>
            </nav>

            <div className="doc-sections">
              {parts.map((p, i) => (
                <section key={p.id} id={p.id} className="doc-section" aria-labelledby={`${p.id}-title`}>
                  <h2 id={`${p.id}-title`}><span className="doc-num">{i + 1}.</span>{p.title}</h2>
                  <div className="doc-body">{p.children}</div>
                </section>
              ))}
              <p className="doc-note">Earlier versions of this page are in the <a href={`${REPO}/commits/main`} target="_blank" rel="noreferrer">repository history</a>.</p>
            </div>
          </article>
        </div>
      </main>

      <SiteFooter />
      <DocSpy />
    </>
  );
}
