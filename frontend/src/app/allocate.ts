/**
 * Who gets what, worked out exactly, in whole cents. Plain arithmetic, never a model: the assistant only
 * proposes the rows, and this decides every amount the sender sees and approves.
 *
 * Each person gets one of:
 *   fixed   — an exact amount ("the first five get $200")
 *   percent — a share of the total ("Sam gets half")
 *   equal   — an equal part of whatever is left after the fixed amounts and percentages
 * Order of work: fixed amounts first, then percentages (rounded down to the cent), then the rest is divided
 * equally. Cents that don't divide evenly go one each to the first people in the list, so the parts always
 * add up to the total exactly, and the screen says who got the extra cent.
 */
export type Mode = "equal" | "percent" | "fixed";
export type Row = { name: string; contact: string; mode: Mode; value: number }; // value: % or $; unused for equal

export type Plan = {
  cents: number[];          // each row's amount, in cents, same order as the rows
  totalCents: number;       // what will be sent
  extraCents: number[];     // indexes of rows that got one extra cent to make it add up
  issue: string | null;     // why it can't be sent yet, in plain words; null when it adds up
};

const dollars = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const toCents = (d: number) => Math.round(d * 100);

export function plan(total: number | null, rows: Row[]): Plan {
  const n = rows.length;
  const cents = rows.map(() => 0);
  const extraCents: number[] = [];
  const fail = (issue: string, totalCents = 0): Plan => ({ cents, totalCents, extraCents, issue });
  if (n === 0) return fail("Add someone to pay.");

  const fixed = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.mode === "fixed");
  const pct = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.mode === "percent");
  const equal = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.mode === "equal");
  fixed.forEach(({ r, i }) => { cents[i] = Math.max(0, toCents(r.value)); });
  const fixedSum = fixed.reduce((s, { i }) => s + cents[i], 0);

  // With only fixed amounts, the total is simply their sum.
  const T = total === null || !(total > 0) ? (pct.length || equal.length ? null : fixedSum) : toCents(total);
  if (T === null) return fail("Enter how much to send in total.");

  const pctSum = pct.reduce((s, { r }) => s + Math.max(0, r.value), 0);
  if (pctSum > 100 + 1e-9) return fail(`The percentages add up to ${Math.round(pctSum * 100) / 100}%, more than the whole.`, T);
  pct.forEach(({ r, i }) => { cents[i] = Math.floor((T * Math.max(0, r.value)) / 100 + 1e-9); });
  const pctCents = pct.reduce((s, { i }) => s + cents[i], 0);

  let rest = T - fixedSum - pctCents;
  if (rest < 0) return fail(`That's ${dollars(-rest)} more than the ${dollars(T)} total.`, T);

  if (equal.length) {
    const each = Math.floor(rest / equal.length);
    equal.forEach(({ i }) => { cents[i] = each; });
    rest -= each * equal.length;
    for (let k = 0; rest > 0; k++, rest--) { cents[equal[k].i] += 1; extraCents.push(equal[k].i); }
  } else if (rest > 0 && rest <= pct.length && Math.abs(pctSum - 100) < 1e-9) {
    // Only percentages adding to 100%: the cents lost to rounding go back, one each, in list order.
    for (let k = 0; rest > 0; k++, rest--) { cents[pct[k].i] += 1; extraCents.push(pct[k].i); }
  }
  if (rest > 0) return fail(`${dollars(rest)} of the ${dollars(T)} isn't assigned to anyone yet.`, T);

  const zero = cents.findIndex((c) => c <= 0);
  if (zero >= 0) return fail(`${rows[zero].name || "Someone"} would get nothing. Remove them or give them a share.`, T);
  return { cents, totalCents: T, extraCents, issue: null };
}

/** Each row's share of the total, for showing next to its amount. */
export const sharesOf = (p: Plan) => p.cents.map((c) => (p.totalCents ? (c / p.totalCents) * 100 : 0));
