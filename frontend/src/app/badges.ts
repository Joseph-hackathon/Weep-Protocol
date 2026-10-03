/**
 * Twenty wallet badge palettes.
 *
 * Every badge shares one geometry and one lighting model (light from the top-left, a soft
 * inner rim); only the two colours change. Each pair is a light "highlight" stop and a deep
 * "body" stop. All highlights sit at a similar lightness and all bodies at a similar depth,
 * so no badge looks heavier or brighter than another against the dark purple surface.
 *
 * Ordered around the colour wheel so neighbouring indices read as clearly different.
 */
export type BadgePalette = { name: string; light: string; deep: string };

export const BADGE_PALETTES: readonly BadgePalette[] = [
  { name: "Amethyst",   light: "#d8ccff", deep: "#6d3fe0" },
  { name: "Orchid",     light: "#f5c2ff", deep: "#9b2fc4" },
  { name: "Peony",      light: "#ffc2e0", deep: "#c02a7a" },
  { name: "Rose",       light: "#ffc8cf", deep: "#c4304a" },
  { name: "Coral",      light: "#ffd0bd", deep: "#d24a2e" },
  { name: "Apricot",    light: "#ffdcb0", deep: "#c96a16" },
  { name: "Honey",      light: "#ffe7a0", deep: "#c98806" },
  { name: "Citron",     light: "#ecf7a2", deep: "#73a30c" },
  { name: "Fern",       light: "#cdf5b4", deep: "#3c9a2c" },
  { name: "Jade",       light: "#b6f2d2", deep: "#12936a" },
  { name: "Lagoon",     light: "#b0f0ec", deep: "#0f8f8a" },
  { name: "Glacier",    light: "#b8ecfa", deep: "#1688b0" },
  { name: "Sky",        light: "#c0dcff", deep: "#2f6fd6" },
  { name: "Cobalt",     light: "#c6cfff", deep: "#3446c9" },
  { name: "Mulberry",   light: "#f2bfd8", deep: "#7a1f55" },
  { name: "Aurora",     light: "#b9f5d8", deep: "#5b45d8" },
  { name: "Nebula",     light: "#ffb8e8", deep: "#2f55d8" },
  { name: "Sunset",     light: "#ffe0a0", deep: "#c52f7e" },
  { name: "Ember",      light: "#ffd89a", deep: "#b3261e" },
  { name: "Graphite",   light: "#e6e4ee", deep: "#55526a" },
];

const BADGE_KEY = "weep.badges";

/**
 * Private, random, non-repeating: the first time a wallet appears in this browser it gets a random
 * palette that no other wallet here has yet. Only once all 20 are taken can one be reused (least-used first).
 * The choice is stored only in this browser and can't be picked by anyone.
 */
export function paletteIndex(address: string): number {
  const key = address.toLowerCase();
  let map: Record<string, number> = {};
  try { map = JSON.parse(localStorage.getItem(BADGE_KEY) || "{}"); } catch {}
  if (Number.isInteger(map[key]) && map[key] >= 0 && map[key] < BADGE_PALETTES.length) return map[key];

  const uses = new Array(BADGE_PALETTES.length).fill(0);
  Object.values(map).forEach((i) => { if (uses[i] !== undefined) uses[i]++; });
  const fewest = Math.min(...uses);
  const candidates = uses.flatMap((n, i) => (n === fewest ? [i] : []));
  const r = new Uint32Array(1);
  crypto.getRandomValues(r);
  const pick = candidates[r[0] % candidates.length];

  map[key] = pick;
  try { localStorage.setItem(BADGE_KEY, JSON.stringify(map)); } catch {}
  return pick;
}

export const paletteFor = (address: string) => BADGE_PALETTES[paletteIndex(address)];
