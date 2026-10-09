import Image from "next/image";
import Link from "next/link";

/**
 * Bottom of every screen: a quiet "Powered by Monad" credit, with Weep's documents and its X account in small
 * print either side of it, so the credit stays centred (and the landing flower still grows out of it).
 * Phones: the credit, then one centred row of links beneath it.
 * The lane directly above it is reserved for the floating island (see --island-zone in globals.css),
 * so adding the island later never moves this or overlaps page content.
 */
export const X_URL = "https://x.com/WeepProtocol";

export default function SiteFooter() {
  return (
    <footer className="site-footer has-legal">
      <nav className="footer-legal footer-legal-start" aria-label="Legal">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
      </nav>
      <a
        href="https://monad.xyz"
        target="_blank"
        rel="noreferrer"
        className="powered-by"
        aria-label="Powered by Monad (opens monad.xyz in a new tab)"
      >
        <span className="powered-by-text">Powered by</span>
        {/* Monad's lockup with the wordmark reversed to white for dark backgrounds; the mark keeps Monad purple */}
        <Image src="/monad-lockup-reverse.png" alt="" width={85} height={16} className="powered-by-logo" />
      </a>
      <nav className="footer-legal footer-legal-end" aria-label="More from Weep">
        <Link href="/how-money-moves">How money moves</Link>
        <a href={X_URL} target="_blank" rel="noreferrer" aria-label="Weep on X" className="footer-x">
          {/* The X mark, drawn in the footer's own colour */}
          <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden focusable="false">
            <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      </nav>
    </footer>
  );
}
