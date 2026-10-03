"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The one Weep logo. Every place that shows the brand uses this, so it can't drift.
 *
 * Asset: /weep-mark.png — the mark cropped to its own edges, so `height` is the visible height
 * (manual §6.1: 24px visual height in headers). Width follows the mark's 628 × 384 proportions.
 */
const RATIO = 628 / 384;

export function BrandMark({ height = 24, priority = false, className }: { height?: number; priority?: boolean; className?: string }) {
  return (
    <Image src="/weep-mark.png" alt="" width={Math.round(height * RATIO)} height={height} priority={priority} className={className ?? "brand-mark"} style={{ width: "auto" }} />
  );
}

/**
 * The logo as a link home (manual §6.1–6.2: clickable, hit area ≥ 44px).
 * On the landing page it returns you to the top instead of doing nothing.
 */
export function BrandLink({ withName = true, onNavigate, priority = false }: { withName?: boolean; onNavigate?: () => void; priority?: boolean }) {
  const path = usePathname();
  return (
    <Link
      href="/"
      className={withName ? "brand" : "brand brand-solo"}
      aria-label="Weep home"
      onClick={(e) => {
        onNavigate?.();
        if (path === "/") {
          e.preventDefault();
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        }
      }}
    >
      <BrandMark priority={priority} />
      {withName && <span className="brand-name">Weep</span>}
    </Link>
  );
}
