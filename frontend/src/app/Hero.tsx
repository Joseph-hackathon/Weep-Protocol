"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import HeroFlower from "./HeroFlower";
import Kinetic from "./Kinetic";
import { ROLES } from "./roles";

const EASE = [0.2, 0.8, 0.2, 1] as const;
const FOLD_MS = 380; // petals fold upright before the hand-off (HeroFlower: 0.32s)
const HANDOFF_MS = 900; // cards travel 0.62s; the hidden flower is removed after they land

/**
 * The landing's two scenes on one stage, so moving between them never reloads or flashes:
 *   "/"      — the proposition and the flower.
 *   "/start" — "Where would you like to go?" with one card per role.
 * Get started folds the flower, then the three role petals travel into the cards (shared layout ids).
 * The URL follows with history.pushState, so Back returns to the flower and a refresh keeps the choice.
 */
export default function Hero() {
  const choosing = usePathname() === "/start";
  const reduce = useReducedMotion();
  // idle → folding (petals fold upright) → handoff (cards mounted, folded flower kept one beat) → idle
  const [stage, setStage] = useState<"idle" | "folding" | "handoff">("idle");
  const [cameFromIntro, setCameFromIntro] = useState(false);

  // When the URL flips, decide the stage in the same render (React's derive-from-props pattern):
  // arriving at /start mid-fold starts the hand-off; anything else resets.
  const [prevChoosing, setPrevChoosing] = useState(choosing);
  if (prevChoosing !== choosing) {
    setPrevChoosing(choosing);
    setStage(choosing && stage === "folding" ? "handoff" : "idle");
  }

  const start = () => {
    if (stage !== "idle") return;
    setStage("folding");
    setCameFromIntro(true);
    setTimeout(() => {
      window.history.pushState(null, "", "/start");
      setTimeout(() => setStage("idle"), HANDOFF_MS);
    }, reduce ? 0 : FOLD_MS);
  };

  return (
    <LayoutGroup>
      {/* A shared-layout hand-off needs the old petals measured in the same update that adds the cards,
          so the folded flower stays mounted (hidden, out of flow) until the cards have landed. */}
      {(!choosing || stage === "handoff") && (
        <Intro leaving={stage !== "idle"} ghost={choosing} returning={cameFromIntro && !choosing && stage === "idle"} onStart={start} />
      )}
      {choosing && <Chooser handOff={cameFromIntro} />}
    </LayoutGroup>
  );
}

function Intro({ leaving, ghost, returning, onStart }: { leaving: boolean; ghost: boolean; returning: boolean; onStart: () => void }) {
  return (
    <div className={ghost ? "page hero-stage hero-stage-ghost" : "page hero-stage"} aria-hidden={ghost || undefined}>
      <motion.div
        className="hero-copy"
        initial={returning ? { opacity: 0, y: -16 } : false}
        animate={leaving ? { opacity: 0, y: -16 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
      >
        <h1 className="hero-title"><Kinetic text="Gratitude, onchain." accent="onchain." /></h1>
        <p className="hero-sub rise" style={{ ["--d" as string]: "260ms" }}>
          Every tip reaches the people who earned it — split clearly, paid automatically, and verified on Monad.
        </p>
        <button type="button" className="btn-connect hero-cta rise" style={{ ["--d" as string]: "380ms" }} onClick={onStart} disabled={leaving}>
          Get started
        </button>
      </motion.div>
      <HeroFlower joining={leaving} handingOff={ghost} returning={returning} />
    </div>
  );
}

/** Desktop pointer tilt + glare: writes four CSS variables on the hovered card only (globals.css .role-card). */
function tilt(e: React.PointerEvent<HTMLAnchorElement>) {
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;   // 0 … 1
  const y = (e.clientY - r.top) / r.height;
  el.style.setProperty("--ry", `${(x - 0.5) * 10}deg`);
  el.style.setProperty("--rx", `${(0.5 - y) * 8}deg`);
  el.style.setProperty("--gx", `${x * 100}%`);
  el.style.setProperty("--gy", `${y * 100}%`);
}
function untilt(e: React.PointerEvent<HTMLAnchorElement>) {
  const el = e.currentTarget;
  for (const v of ["--rx", "--ry"]) el.style.setProperty(v, "0deg");
}

/** The employee card's chip: a new tip arrives every few seconds. */
const ARRIVALS = ["6.00", "4.50", "12.00", "3.25", "8.00"];
function Arrivals() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) setN((x) => (x + 1) % ARRIVALS.length); }, 2800);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="role-chip-amount">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.b key={n} initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "-100%", opacity: 0 }} transition={{ duration: 0.32, ease: EASE }}>
          +${ARRIVALS[n]}
        </motion.b>
      </AnimatePresence>
    </span>
  );
}

/** `handOff`: arrived from the flower, so the photos fly in from the petals instead of fading up. */
function Chooser({ handOff }: { handOff: boolean }) {
  const lead = handOff ? 0.18 : 0; // let the photos start travelling before the words arrive
  return (
    <div className="page chooser">
      <div className="chooser-floor" aria-hidden />
      <div className="chooser-head">
        <h1 className="chooser-title"><Kinetic text="Where would you like to go?" delay={lead * 1000} /></h1>
        <p className="chooser-sub rise" style={{ ["--d" as string]: `${lead * 1000 + 240}ms` }}>Pick one. You can switch anytime.</p>
      </div>

      <ul className="chooser-grid">
        {ROLES.map((r, i) => (
          <li key={r.id}>
            <Link href={r.href} className="role-card" onPointerMove={tilt} onPointerLeave={untilt}>
              <motion.div
                layoutId={`role-${r.id}`}
                layoutCrossfade={false}
                className="role-photo"
                initial={handOff ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ layout: { duration: 0.62, ease: EASE }, duration: 0.5, delay: handOff ? 0 : 0.1 + i * 0.08, ease: EASE }}
              >
                <Image src={r.img} alt="" fill sizes="(min-width: 600px) 280px, 64px" />
                <span className="role-glare" aria-hidden />
                <span className="role-chip" aria-hidden style={{ ["--d" as string]: `${(lead + 0.5 + i * 0.08) * 1000}ms` }}>
                  {r.id === "employee" ? (<><span className="role-chip-dot" /><Arrivals /><span className="role-chip-muted">{r.chip}</span></>) : r.chip}
                </span>
              </motion.div>
              <motion.span
                className="role-text"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: lead + 0.22 + i * 0.07, ease: EASE }}
              >
                <span className="role-title">{r.title}</span>
                <span className="role-line">{r.line}</span>
              </motion.span>
              <ChevronRight className="role-chevron" size={20} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
