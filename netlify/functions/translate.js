exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API key not configured" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { text, fromLang, toLang } = body;
  if (!text || !fromLang || !toLang) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing fields" }) };
  }

  const prompt = `You are an EMS emergency medical translator. Translate the following text from ${fromLang} to ${toLang}. Respond with ONLY the translation — no explanations, no notes, no quotation marks, no preamble. Preserve urgency and tone. Keep medical terminology accurate. If the text is already in ${toLang}, return it unchanged.\n\nText: ${text}`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1000, temperature: 0.1 }
      })
    }
  );

  if (!geminiRes.ok) {
    const err = await geminiRes.text();
    return { statusCode: geminiRes.status, body: JSON.stringify({ error: err }) };
  }

  const data = await geminiRes.json();
  const translation = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ translation })
  };
};