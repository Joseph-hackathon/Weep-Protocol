import { Fragment } from "react";

/**
 * Kinetic type: each word rises out of its own mask, one after another. Pure CSS (globals.css .kinetic),
 * so it plays from the server HTML at first paint — no JavaScript needed, nothing to wait for.
 * `accent` names a word that also gets the slow light sweep.
 */
export default function Kinetic({ text, accent, delay = 0 }: { text: string; accent?: string; delay?: number }) {
  const words = text.split(" ");
  return (
    <span className="kinetic" style={{ ["--d" as string]: `${delay}ms` }}>
      {words.map((w, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span className="kinetic-word">
            <span className={w === accent ? "kinetic-inner kinetic-accent" : "kinetic-inner"} style={{ ["--i" as string]: i }}>{w}</span>
          </span>
        </Fragment>
      ))}
    </span>
  );
}
