"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SPLITTER, ausdBalance, receivedRecently, toDollars } from "./chain";

/**
 * What a wallet holds and what reached it: shared by My money (individuals) and the Employee Dashboard
 * (a business's staff), so both read the same Monad data the same way.
 *   balance — live, in dollars
 *   list    — every payment in: amount, sender, the time Monad recorded, and its transaction;
 *             read from the chain while the page is open and remembered on this device
 *   latest  — a payment that landed while watching, for a few seconds (what's already there on opening is
 *             history, not a new arrival)
 */
export type Received = { hash: string; from: string; cents: number; at: number };
const POLL_MS = 4000;
const keyOf = (a: string) => `weep.received.${a.toLowerCase()}`;
function remembered(a: string): Received[] {
  try { return JSON.parse(localStorage.getItem(keyOf(a)) ?? "[]") as Received[]; } catch { return []; }
}

export function useReceived(address: string | null | undefined) {
  const [balance, setBalance] = useState<{ of: string; dollars: number } | null>(null);
  const [history, setHistory] = useState<{ of: string; list: Received[] } | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!address) return;
    let live = true;
    const start = remembered(address);
    seen.current = new Set(start.map((r) => r.hash + r.from));
    const t0 = setTimeout(() => live && setHistory({ of: address, list: start }), 0);
    let first = true;
    const read = async () => {
      if (document.hidden) return;
      try {
        const [b, recent] = await Promise.all([ausdBalance(address), receivedRecently(address)]);
        if (!live) return;
        setBalance({ of: address, dollars: toDollars(b) });
        const added = recent
          .filter((m) => !seen.current.has(m.hash + m.from))
          .map((m) => ({ hash: m.hash, from: m.from, cents: Number(m.units / BigInt(10) ** BigInt(16)), at: m.at }));
        if (added.length) {
          added.forEach((r) => seen.current.add(r.hash + r.from));
          setHistory((h) => {
            const list = [...added, ...(h && h.of === address ? h.list : [])].slice(0, 60);
            try { localStorage.setItem(keyOf(address), JSON.stringify(list)); } catch {}
            return { of: address, list };
          });
          if (!first) {
            try { navigator.vibrate?.(12); } catch {}
            setFresh(added[0].hash);
            setTimeout(() => live && setFresh(null), 8000);
          }
        }
        first = false;
      } catch {}
    };
    read();
    const id = setInterval(read, POLL_MS);
    return () => { live = false; clearTimeout(t0); clearInterval(id); };
  }, [address]);

  const dollars = balance && balance.of === address ? balance.dollars : null;
  const list = useMemo(() => (history && history.of === address ? history.list : []), [history, address]);
  const latest = fresh ? list.find((r) => r.hash === fresh) ?? null : null;
  return { dollars, list, latest };
}

/** The name someone shows on their own pay-me link, kept on this device (shared by both sides). */
export const NAME_KEY = "weep.name";

/** Who a payment came from, in words: the business's tip pool, or the sender's wallet. */
export const fromLabel = (from: string) =>
  from.toLowerCase() === SPLITTER.toLowerCase() ? "team tips" : `${from.slice(0, 6)}…${from.slice(-4)}`;
