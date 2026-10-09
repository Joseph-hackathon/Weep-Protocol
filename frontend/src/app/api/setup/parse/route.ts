import { NextResponse } from "next/server";
import { SchemaType, type ResponseSchema } from "@google/generative-ai";
import { readJson } from "../../gemini";

/**
 * One-prompt team setup, step 1: read the merchant's plain-words description with Gemini and return
 * the team and the tip rule as structured data. Nothing is saved here; the merchant reviews it first.
 */
export type Setup = {
  employees: { name: string; email: string; group: "floor" | "kitchen" | "bar" }[];
  pool: { foh: number; boh: number; bar: number };
  notes: string[]; // anything the model couldn't place, said back to the merchant in plain words
};

const MAX_CHARS = 4000;

const schema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    employees: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING, description: "First name as the merchant wrote it" },
          email: { type: SchemaType.STRING, description: "Email address, lowercase; empty string if none was given" },
          group: { type: SchemaType.STRING, format: "enum", enum: ["floor", "kitchen", "bar"], description: "floor = front of house (servers, hosts, baristas, runners); kitchen = back of house (chefs, cooks, dishwashers); bar = bartenders" },
        },
        required: ["name", "email", "group"],
      },
    },
    pool: {
      type: SchemaType.OBJECT,
      description: "How tips to the whole team are split, in whole percent, summing to 100",
      properties: { foh: { type: SchemaType.INTEGER }, boh: { type: SchemaType.INTEGER }, bar: { type: SchemaType.INTEGER } },
      required: ["foh", "boh", "bar"],
    },
    notes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Short plain-language notes about anything unclear or missing" },
  },
  required: ["employees", "pool", "notes"],
};

const instructions = `You set up tipping for a restaurant, bar or café on Weep.
Read the owner's description and return their team and how pooled tips are split.
- Groups: floor (front of house), kitchen (back of house), bar.
- If a split is given for only some groups, give the rest 0. If no split is given, use foh 60, boh 30, bar 10 and add a note saying so.
- Percentages are whole numbers that add up to exactly 100.
- Never invent people or emails. If someone has no email, use an empty string and add a note.
- Direct tips to a named person always go 100% to that person; you don't need to return that.`;

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  const prompt = (text ?? "").trim();
  if (!prompt) return NextResponse.json({ error: "empty" }, { status: 400 });
  if (prompt.length > MAX_CHARS) return NextResponse.json({ error: "too-long" }, { status: 400 });

  try {
    const data = await readJson<Setup>(key, instructions, schema, prompt);

    // Tidy and check what came back, so the page never shows something the contract would refuse.
    const employees = (data.employees ?? [])
      .map((e) => ({ name: String(e.name ?? "").trim().slice(0, 40), email: String(e.email ?? "").trim().toLowerCase(), group: e.group }))
      .filter((e) => e.name && ["floor", "kitchen", "bar"].includes(e.group));
    const pool = { foh: Math.max(0, Math.round(data.pool?.foh ?? 0)), boh: Math.max(0, Math.round(data.pool?.boh ?? 0)), bar: Math.max(0, Math.round(data.pool?.bar ?? 0)) };
    const notes = (data.notes ?? []).map(String).slice(0, 5);
    if (pool.foh + pool.boh + pool.bar !== 100) notes.push("The split didn't add up to 100%, so please adjust it below.");
    return NextResponse.json({ employees, pool, notes } satisfies Setup);
  } catch (e) {
    console.error("setup/parse", e);
    return NextResponse.json({ error: "ai-failed" }, { status: 502 });
  }
}

