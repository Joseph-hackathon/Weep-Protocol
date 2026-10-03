"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/**
 * The landing's living picture: the people a tip is for bloom out of "Powered by Monad" like a flower,
 * once, and stay open. Every few seconds a tip lands on the centre petal and the shares update on every
 * petal, so the page shows the product working without saying how. Decorative: hidden from assistive tech.
 * Geometry lives in globals.css (.flower); this file only owns the choreography.
 */

// Petals left → right. Angles step evenly (12°) around one shared pivot 1.6 petal-heights below the petals.
// Three petals carry a `role`: on "Get started" they become the chooser's cards (see Hero.tsx).
const PETALS = [
  { src: "/hero/bartender.jpg", angle: -24, role: "employee" },
  { src: "/hero/barista.jpg", angle: -12 },
  { src: "/hero/kitchen.jpg", angle: 0, role: "merchant" },
  { src: "/hero/chefs.jpg", angle: 12 },
  { src: "/hero/bar.jpg", angle: 24, role: "customer" },
];
const CENTRE = 2;

// Each tip lands on the centre petal and splits across all five; shares always add up to the tip.
const TIPS = [
  { total: "20.00", shares: ["4.00", "5.00", "6.00", "3.00", "2.00"] },
  { total: "12.00", shares: ["2.00", "3.00", "4.00", "2.00", "1.00"] },
  { total: "35.00", shares: ["6.00", "8.00", "9.00", "7.00", "5.00"] },
];

type Phase = "closed" | "bloom" | "tip" | "split";
const DURATION: Record<Phase, number> = { closed: 400, bloom: 900, tip: 900, split: 3600 };
// Blooms once; after that it only cycles tip → split, so the flower never closes.
const NEXT: Record<Phase, Phase> = { closed: "bloom", bloom: "tip", tip: "split", split: "tip" };
const EASE = [0.2, 0.8, 0.2, 1] as const;
const CLOSED = { rotate: 0, y: "60%", scale: 0.4, opacity: 0 };
/** Petals folded together, upright: the hand-off pose to (and back from) the chooser. */
const JOINED = { rotate: 0, y: 0, scale: 1, opacity: 1 };

/** "20.00" → $20 with the cents in their own span, so compact screens can drop them. */
function Amount({ value, sign = "" }: { value: string; sign?: string }) {
  const [whole, cents] = value.split(".");
  return <b>{sign}${whole}<span className="flower-cents">.{cents}</span></b>;
}

/**
 * `joining`: the visitor pressed Get started — fold the petals together and let the role petals hand off.
 * `returning`: the visitor came back from the chooser — start folded and bloom open again.
 */
// `handingOff` changes nothing visible; it makes the petals re-render in the commit that mounts the cards,
// which is when the shared-layout hand-off takes their measurements.
export default function HeroFlower({ joining = false, handingOff = false, returning = false }: { joining?: boolean; handingOff?: boolean; returning?: boolean }) {
  // The server can't know the visitor's motion preference, so the first (hydrating) frame is always
  // "closed"; once mounted, reduced motion jumps straight to one still frame of the open flower.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const reduce = Boolean(useReducedMotion()) && mounted;
  const [live, setLive] = useState<Phase>(returning ? "bloom" : "closed");
  const [tip, setTip] = useState(0);
  const phase: Phase = reduce ? "split" : live;
  const showChips = !joining;
  const ms = (seconds: number) => (reduce ? 0 : seconds);

  useEffect(() => {
    if (reduce || joining) return;
    let t: ReturnType<typeof setTimeout>;
    const step = () => {
      // Hidden tab: hold the current frame instead of queueing tips nobody sees.
      if (document.hidden) { t = setTimeout(step, DURATION[live]); return; }
      if (live === "split") setTip((n) => (n + 1) % TIPS.length);
      setLive(NEXT[live]);
    };
    t = setTimeout(step, DURATION[live]);
    return () => clearTimeout(t);
  }, [live, reduce, joining]);

  // Each time a tip lands, the Monad mark answers with a glow — it is what settles the payment.
  useEffect(() => {
    const root = document.documentElement;
    if (phase === "tip" && !joining) root.dataset.settle = "true";
    else delete root.dataset.settle;
    return () => { delete root.dataset.settle; };
  }, [phase, joining]);

  const t = TIPS[tip];

  return (
    <div className="flower" aria-hidden data-handoff={handingOff || undefined}>
      {PETALS.map((p, i) => {
        const fromCentre = Math.abs(i - CENTRE);
        return (
          <motion.div
            key={p.src}
            className="flower-petal"
            style={{ zIndex: 10 - fromCentre, originX: 0.5, originY: 2.6 }}
            initial={returning ? JOINED : CLOSED}
            animate={joining ? JOINED : phase === "closed" ? CLOSED : { rotate: p.angle, y: 0, scale: 1, opacity: 1 }}
            transition={{ duration: ms(joining ? 0.32 : 0.7), delay: phase === "bloom" && !joining ? fromCentre * 0.07 : 0, ease: EASE }}
            data-lit={joining ? Boolean(p.role) : (i === CENTRE && phase === "tip") || phase === "split"}
          >
            {/* The shared id is only set while folding, when the petal is upright, so the hand-off
                measures a true box (a rotated parent would skew it). Framer registers shared ids at
                mount, so the key remounts the photo the moment it gains its id. */}
            <motion.div
              key={joining && p.role ? "handoff" : "bloom"}
              className="flower-photo"
              layoutId={joining && p.role ? `role-${p.role}` : undefined}
            >
              {/* Eager: the petals start hidden, so lazy-loading would wait for a bloom that needs them. */}
              <Image src={p.src} alt="" fill sizes="(min-width: 840px) 240px, 160px" loading="eager" />
            </motion.div>
            {/* Chips sit on each petal's tip and stay upright. */}
            <AnimatePresence>
              {showChips && i === CENTRE && phase === "tip" && (
                <motion.span key={`tip${tip}`} className="flower-chip flower-chip-tip"
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: ms(0.24), ease: EASE }}>
                  <span className="flower-dot" /><span className="flower-chip-label">Tip </span><Amount value={t.total} />
                </motion.span>
              )}
              {showChips && phase === "split" && (
                <motion.span key={`share${tip}-${i}`} className="flower-chip" style={{ rotate: -p.angle }}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: ms(0.24), delay: ms(fromCentre * 0.12), ease: EASE }}>
                  <Amount value={t.shares[i]} sign="+" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
