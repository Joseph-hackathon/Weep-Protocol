import { 
  APICallCapability, 
  EVMClient, 
  HTTPClient, 
  handler, 
  type Runtime 
} from "@chainlink/cre-sdk";

async function weepPolicyWorkflow(runtime: Runtime, request: any) {
  // 1. Extract the natural language prompt sent by the Weep frontend
  const prompt = request.body?.prompt || "FOH 50, BOH 30, BAR 20";

  // 2. Call Google Gemini via HTTP to parse prompt into JSON
  // Note: We use HTTPClient because CRE workflows compile to WASM (no Node.js modules)
  const httpClient = new HTTPClient();
  const apiKey = await runtime.getSecret("GEMINI_API_KEY");
  
  const geminiResponse = await httpClient.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `Extract the tip distribution percentages from this text. Return ONLY a valid JSON object with keys FOH, BOH, BAR and integer values. Example: {"FOH": 60, "BOH": 30, "BAR": 10}. Text: "${prompt}"` }]
      }]
    })
  });

  let roles = { FOH: 50, BOH: 30, BAR: 20 };
  if (geminiResponse && geminiResponse.candidates && geminiResponse.candidates.length > 0) {
    try {
      const responseText = geminiResponse.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim();
      roles = JSON.parse(responseText);
    } catch (e) {
      console.log("Failed to parse AI response, using defaults");
    }
  }

  // 3. Execute transaction on Monad Testnet to update the Policy
  const evmClient = new EVMClient();
  await evmClient.writeContract(runtime, {
    chain: "monad-testnet",
    address: "0x1A245Dc83F286CA5A6833626E813776623f9F336", // TipSplitter contract address
    abi: [{"name": "updatePolicy", "type": "function", "stateMutability": "nonpayable", "inputs": [{"name": "_foh", "type": "uint256"}, {"name": "_boh", "type": "uint256"}, {"name": "_bar", "type": "uint256"}]}],
    functionName: "updatePolicy",
    args: [roles.FOH, roles.BOH, roles.BAR]
  });

  return { success: true, parsedRoles: roles };
}

// 4. Bind workflow to an API trigger so Weep Next.js backend can trigger it remotely
export const main = handler(
  new APICallCapability().trigger({ endpoint: "/api/trigger-policy" }),
  weepPolicyWorkflow
);
