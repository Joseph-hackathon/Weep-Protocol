"use client";

/**
 * The sign-in method used most recently in this browser, so the sign-in window can offer it first.
 * Stored only in this browser (a per-person convenience); cleared by nothing else in the app.
 */
export type LastMethod =
  | { type: "email"; email: string }
  | { type: "wallet"; rdns: string; name: string }
  | { type: "all" };

const KEY = "weep.lastMethod";

export function saveLastMethod(m: LastMethod) {
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch {}
}

export function readLastMethod(): LastMethod | null {
  try {
    const m = JSON.parse(localStorage.getItem(KEY) || "null");
    return m && typeof m.type === "string" ? (m as LastMethod) : null;
  } catch {
    return null;
  }
}
