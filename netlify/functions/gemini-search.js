// netlify/functions/gemini-search.js
// ─────────────────────────────────────────────────────────────────────────────
// Calls Google Gemini API with Google Search grounding.
// The API key lives in Netlify environment variables — NEVER in frontend code.
// ─────────────────────────────────────────────────────────────────────────────

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Set this in Netlify dashboard
  if (!GEMINI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "GEMINI_API_KEY not set in environment variables." }),
    };
  }

  try {
    const { messages, system } = JSON.parse(event.body);

    // ── Call Gemini 2.0 Flash with Google Search grounding ───────────────────
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: system || "" }],
          },
          contents: messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          tools: [
            {
              // Google Search grounding — Gemini searches the web natively
              google_search: {},
            },
          ],
          generationConfig: {
            maxOutputTokens: 1500,
            temperature: 0.3,
          },
        }),
      }
    );

    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("") || "No response from Gemini.";

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, text }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
