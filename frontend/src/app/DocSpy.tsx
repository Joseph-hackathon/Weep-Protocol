"use client";

import { useEffect } from "react";

/** Marks the section being read in the contents (aria-current), so the side rail on wide screens shows where you are. */
export default function DocSpy() {
  useEffect(() => {
    const links = new Map(
      [...document.querySelectorAll<HTMLAnchorElement>(".doc-contents a")].map((a) => [a.hash.slice(1), a] as const),
    );
    const sections = [...document.querySelectorAll<HTMLElement>(".doc-section")];
    if (!sections.length) return;
    const mark = () => {
      // The last section whose top has passed the upper third of the screen
      const line = window.innerHeight / 3;
      let current = sections[0];
      for (const s of sections) if (s.getBoundingClientRect().top <= line) current = s;
      links.forEach((a, id) => (id === current.id ? a.setAttribute("aria-current", "location") : a.removeAttribute("aria-current")));
    };
    mark();
    window.addEventListener("scroll", mark, { passive: true });
    window.addEventListener("resize", mark);
    return () => { window.removeEventListener("scroll", mark); window.removeEventListener("resize", mark); };
  }, []);
  return null;
}
