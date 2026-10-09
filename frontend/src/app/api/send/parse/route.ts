import { NextResponse } from "next/server";
import { SchemaType, type ResponseSchema } from "@google/generative-ai";
import { readJson } from "../../gemini";

/**
 * Send, step 1: read a plain-words payment ("$60 to Sam, Ama and Kai, Sam gets half"; "$2,000 among these
 * 20 winners, the first five get $200, the rest share equally") into rows: who, how to reach them, and how
 * their part is set (fixed amount, percent, or an equal share of the rest). It does no arithmetic: the page
 * works out every amount, and the sender reviews and approves the exact payment. Anything unclear comes back
 * as a question instead of a guess.
 */
type Row = { name: string; contact: string; mode: "equal" | "percent" | "fixed"; value: number };
export type SendDraft = { total: number; rows: Row[]; questions: string[] };

const MAX_CHARS = 6000;
const MAX_ROWS = 100;

const schema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    total: { type: SchemaType.NUMBER, description: "The total to send in dollars, as written; 0 if not stated" },
    rows: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING, description: "The person's name as written (or e.g. 'Winner 7' if only numbered)" },
          contact: { type: SchemaType.STRING, description: "Their email or 0x wallet address exactly as written; empty string if none" },
          mode: { type: SchemaType.STRING, format: "enum", enum: ["fixed", "percent", "equal"], description: "fixed = an exact dollar amount; percent = a share of the total; equal = an equal part of what's left" },
          value: { type: SchemaType.NUMBER, description: "Dollars for fixed, percent for percent, 0 for equal" },
        },
        required: ["name", "contact", "mode", "value"],
      },
    },
    questions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Short questions about anything ambiguous or missing; empty if all is clear" },
  },
  required: ["total", "rows", "questions"],
};

const instructions = `You turn someone's description of a payment into rows, for Weep. You never calculate amounts.
- One row per person, in the order written. Use their name as written. Copy emails and 0x wallet addresses exactly; if none is given, leave contact empty.
- mode "fixed" when an exact dollar amount is stated for that person; "percent" when a share like "half" (50) or "30%" is stated; "equal" when they share what's left equally, or when no rule is given.
- "The first five get $200" means those five rows are fixed at 200. "Divide the rest equally among the others" means those rows are equal.
- If people are only counted ("20 winners") and not named, create that many rows named "Winner 1", "Winner 2"… with empty contacts, and ask for their emails or wallets.
- Ask a question instead of guessing when the total, a person, or the rule is unclear, or when the amounts can't add up.
- Never invent people, emails, wallets or amounts.`;

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "not-configured" }, { status: 503 });

  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  const prompt = (text ?? "").trim();
  if (!prompt) return NextResponse.json({ error: "empty" }, { status: 400 });
  if (prompt.length > MAX_CHARS) return NextResponse.json({ error: "too-long" }, { status: 400 });

  try {
    const data = await readJson<SendDraft>(key, instructions, schema, prompt);
    // Tidy what came back so the review never shows something the payment would refuse.
    const rows = (data.rows ?? []).slice(0, MAX_ROWS).map((r) => ({
      name: String(r.name ?? "").trim().slice(0, 40),
      contact: String(r.contact ?? "").trim(),
      mode: (["fixed", "percent", "equal"].includes(r.mode) ? r.mode : "equal") as Row["mode"],
      value: Math.max(0, Number(r.value) || 0),
    })).filter((r) => r.name);
    const questions = (data.questions ?? []).map(String).filter(Boolean).slice(0, 4);
    if ((data.rows ?? []).length > MAX_ROWS) questions.push(`Weep pays up to ${MAX_ROWS} people at once. Split the rest into another payment.`);
    return NextResponse.json({ total: Math.max(0, Number(data.total) || 0), rows, questions } satisfies SendDraft);
  } catch (e) {
    console.error("send/parse", e);
    return NextResponse.json({ error: "ai-failed" }, { status: 502 });
  }
}

