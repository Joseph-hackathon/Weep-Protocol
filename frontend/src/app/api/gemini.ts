import { GoogleGenerativeAI, type ResponseSchema } from "@google/generative-ai";

/**
 * One structured Gemini read, shared by Send and the Merchant Portal.
 * Newest model first; GEMINI_MODEL can pin one. A model that's missing or refused (404, 403) hands over to
 * the next at once. Anything passing (busy, server error, timeout, an answer that isn't the JSON asked for)
 * gets one more try after a short pause, then the next model. Only a bad request (400) stops early.
 */
const MODELS = [process.env.GEMINI_MODEL, "gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"].filter(Boolean) as string[];
const TIMEOUT_MS = 20_000;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function readJson<T>(key: string, instructions: string, schema: ResponseSchema, prompt: string): Promise<T> {
  const ai = new GoogleGenerativeAI(key);
  let last: unknown;
  for (const name of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = ai.getGenerativeModel(
          { model: name, systemInstruction: instructions, generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0 } },
          { timeout: TIMEOUT_MS },
        );
        return JSON.parse((await model.generateContent(prompt)).response.text()) as T;
      } catch (e) {
        last = e;
        const status = (e as { status?: number }).status;
        if (status === 400) throw e;
        if (status === 404 || status === 403) break;
        if (attempt === 0) await pause(300 + Math.random() * 500);
      }
    }
  }
  throw last;
}
