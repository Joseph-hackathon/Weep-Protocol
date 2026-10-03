import type { Metadata } from "next";

// "/start" is the landing's second scene ("Where would you like to go?"). It renders the same page so the
// flower → cards hand-off can run in place (Hero.tsx); visiting it directly opens straight on the cards.
export { default, viewport } from "../page";

export const metadata: Metadata = { title: "Get started · Weep" };
