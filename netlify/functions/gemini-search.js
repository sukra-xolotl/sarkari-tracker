// netlify/functions/gemini-search.js
// Handles two modes:
//   1. AI Counsellor chat  → receives { system, messages }  → returns { text }
//   2. Job enrichment      → receives { jobTitle, link }    → returns { success, enriched }

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" },
      body: "",
    };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "GEMINI_API_KEY not set" }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  // ── MODE 1: Job enrichment (called by enrichJobWithGemini in App.jsx) ───────
  if (body.jobTitle) {
    const prompt = `Search the web for the latest official notification for: "${body.jobTitle}"

Find and return ONLY a JSON object with these exact fields (no markdown, no explanation, just raw JSON):
{
  "formStart":   "DD Month YYYY or null",
  "lastDate":    "DD Month YYYY or null",
  "examDate":    "DD Month YYYY or null",
  "vacancies":   "number as string or null",
  "eligibility": "brief qualification required or null",
  "applyLink":   "direct official apply URL or null",
  "confirmed":   true or false,
  "source":      "domain name of source used"
}
Rules:
- Prefer sarkariresult.com, official .gov.in or .nic.in sites
- If application is already open, formStart is a recent past date
- If date is tentative, still include it but set confirmed=false
- Return ONLY the JSON. No backticks, no preamble.`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
          }),
        }
      );
      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(clean); }
      catch { const m = clean.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : null; }

      if (!parsed) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ success: false, error: "Could not parse Gemini response" }),
        };
      }
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ success: true, enriched: parsed }),
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ success: false, error: err.message }),
      };
    }
  }

  // ── MODE 2: AI Counsellor chat (called by sendMessage in App.jsx) ───────────
  const { system, messages } = body;
  if (!messages?.length) {
    return { statusCode: 400, body: JSON.stringify({ error: "messages array is required" }) };
  }

  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: system ? { parts: [{ text: system }] } : undefined,
          contents,
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      }
    );
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, no response.";
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ text }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ text: "Network error. Please try again." }),
    };
  }
};