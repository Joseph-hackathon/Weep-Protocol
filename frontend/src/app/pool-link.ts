"use client";

import { isWeepPool } from "./chain";

/**
 * Which business a customer is tipping. A table code or tip link carries the business's pool (?pool=0x…);
 * the last one used is remembered on this device, so /customer opens on it again. A pool is only used once
 * Monad confirms it's a real Weep pool.
 */
const KEY = "weep.pool";
const isAddress = (s: string | null): s is string => !!s && /^0x[0-9a-fA-F]{40}$/.test(s);

export const poolLink = (pool: string) => `/customer?pool=${pool.toLowerCase()}`;

/**
 * The pool to open, confirmed on Monad: "none" when there's no code or saved pool yet, "bad" when the link
 * points at something that isn't a Weep pool.
 */
export async function resolvePool(): Promise<string | "none" | "bad"> {
  const fromLink = new URLSearchParams(window.location.search).get("pool");
  if (fromLink) {
    if (!isAddress(fromLink) || !(await isWeepPool(fromLink))) return "bad";
    try { localStorage.setItem(KEY, fromLink.toLowerCase()); } catch {}
    return fromLink.toLowerCase();
  }
  let saved: string | null = null;
  try { saved = localStorage.getItem(KEY); } catch {}
  if (isAddress(saved) && (await isWeepPool(saved).catch(() => false))) return saved;
  return "none";
}
