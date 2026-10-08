import Image from "next/image";
import Link from "next/link";

/**
 * Bottom of every screen: a quiet "Powered by Monad" credit. On the landing page (`legal`), the documents sit in
 * small print either side of it, so the credit stays centred and the flower still grows out of it. Narrow phones
 * keep just Terms (left) and Privacy (right); How money moves is one tap away from either.
 * The lane directly above it is reserved for the floating island (see --island-zone in globals.css),
 * so adding the island later never moves this or overlaps page content.
 */
export default function SiteFooter({ legal = false }: { legal?: boolean }) {
  return (
    <footer className={`site-footer${legal ? " has-legal" : ""}`}>
      {legal && (
        <nav className="footer-legal footer-legal-start" aria-label="Legal">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy" className="footer-legal-wide">Privacy</Link>
        </nav>
      )}
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
      {legal && (
        <nav className="footer-legal footer-legal-end" aria-label="Documents">
          <Link href="/privacy" className="footer-legal-narrow">Privacy</Link>
          <Link href="/how-money-moves" className="footer-legal-wide">How money moves</Link>
        </nav>
      )}
    </footer>
  );
}
