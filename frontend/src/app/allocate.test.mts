// Run with `npm test` (Node 22.18+ runs TypeScript directly). Every amount a sender approves comes from plan(),
// so these check the promises the review screen makes: exact cents, nothing lost, nothing invented.
import { test } from "node:test";
import assert from "node:assert/strict";
import { plan, type Row } from "./allocate.ts";

const row = (mode: Row["mode"], value = 0, name = "x"): Row => ({ name, contact: "", mode, value });
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

test("equal shares add up to the total exactly; the first rows get the extra cents", () => {
  const p = plan(100, [row("equal"), row("equal"), row("equal")]);
  assert.deepEqual(p.cents, [3334, 3333, 3333]);
  assert.equal(p.totalCents, 10000);
  assert.deepEqual(p.extraCents, [0]);
  assert.equal(p.issue, null);
});

test("fixed first, then percent of the total, then equal shares of the rest", () => {
  // $60: Sam gets half, Ama and Kai share the rest
  assert.deepEqual(plan(60, [row("percent", 50), row("equal"), row("equal")]).cents, [3000, 1500, 1500]);
  // $340: Tunde fixed $100, two share the rest
  assert.deepEqual(plan(340, [row("fixed", 100), row("equal"), row("equal")]).cents, [10000, 12000, 12000]);
  // $400: half, a quarter, a quarter
  assert.deepEqual(plan(400, [row("percent", 50), row("percent", 25), row("percent", 25)]).cents, [20000, 10000, 10000]);
});

test("20 winners: five fixed at $200, fifteen share $1,000 to the cent", () => {
  const rows = [...Array(5)].map(() => row("fixed", 200)).concat([...Array(15)].map(() => row("equal")));
  const p = plan(2000, rows);
  assert.equal(sum(p.cents), 200000);
  assert.equal(p.cents.slice(5).filter((c) => c === 6667).length, 10);
  assert.equal(p.cents.slice(5).filter((c) => c === 6666).length, 5);
});

test("odd totals keep every cent: $1,250.75 three ways", () => {
  const p = plan(1250.75, [row("equal"), row("equal"), row("equal")]);
  assert.deepEqual(p.cents, [41692, 41692, 41691]);
  assert.equal(sum(p.cents), 125075);
});

test("fixed amounts alone need no total", () => {
  const p = plan(null, [row("fixed", 50), row("fixed", 25)]);
  assert.equal(p.totalCents, 7500);
  assert.equal(p.issue, null);
});

test("refuses what can't add up instead of guessing", () => {
  assert.notEqual(plan(150, [row("fixed", 100), row("fixed", 80)]).issue, null); // more than the total
  assert.notEqual(plan(100, [row("percent", 60), row("percent", 60)]).issue, null); // over 100%
});

test("5,000 random plans: whenever a plan is sendable, the parts equal the total and nobody gets a negative amount", () => {
  let seed = 42;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  for (let i = 0; i < 5000; i++) {
    const n = 1 + Math.floor(rand() * 30);
    const total = Math.round(rand() * 1_000_000) / 100;
    const rows = [...Array(n)].map(() => {
      const r = rand();
      return r < 0.2 ? row("fixed", Math.round(rand() * total * 10) / 100) : r < 0.4 ? row("percent", Math.floor(rand() * 30)) : row("equal");
    });
    const p = plan(total, rows);
    if (p.issue) continue;
    assert.equal(sum(p.cents), p.totalCents, `plan ${i}`);
    assert.ok(p.cents.every((c) => Number.isInteger(c) && c >= 0), `plan ${i}`);
    assert.ok(p.extraCents.length < Math.max(1, rows.filter((r) => r.mode === "equal").length), `plan ${i}`);
  }
});
