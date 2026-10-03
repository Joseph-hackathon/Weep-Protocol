import Image from "next/image";

/**
 * Bottom of every screen: a quiet "Powered by Monad" credit.
 * The lane directly above it is reserved for the floating island (see --island-zone in globals.css),
 * so adding the island later never moves this or overlaps page content.
 */
export default function SiteFooter() {
  return (
    <footer className="site-footer">
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
    </footer>
  );
}
