import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured in environment variables.');
      return NextResponse.json({ error: 'AI capabilities are currently unavailable.' }, { status: 500 });
    }

    // Call Gemini 2.5 Flash to parse the natural language tip policy
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ 
            text: `Extract the tip distribution percentages and employee mapping from this text. 
            Return ONLY a valid JSON object. 
            Example response format: {"fohRatio": 60, "bohRatio": 30, "barRatio": 10, "employees": [{"name": "Alice", "role": "FOH", "email": "alice@email.com"}]}. 
            Text: "${prompt}"` 
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    let parsedRules = null;
    if (data.candidates && data.candidates.length > 0) {
      const responseText = data.candidates[0].content.parts[0].text;
      // Clean up markdown code blocks if Gemini returns them
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedRules = JSON.parse(cleanJson);
    }

    // Here we would typically also call the Privy Server API to pre-generate wallets
    // for the parsed emails, and then prepare the transaction payload for the smart contract.

    return NextResponse.json({ 
      success: true, 
      message: 'Policy parsed successfully',
      data: parsedRules 
    });

  } catch (error: any) {
    console.error('Error processing merchant setup:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
