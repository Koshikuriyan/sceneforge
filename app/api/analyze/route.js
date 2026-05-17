export async function POST(req) {
  try {
    const { sentences, batchSize } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "GEMINI_API_KEY not set in Vercel Environment Variables." }, { status: 500 });
    }

    const batches = [];
    for (let i = 0; i < sentences.length; i += batchSize) {
      batches.push(sentences.slice(i, i + batchSize));
    }

    const allResults = [];

    for (const batch of batches) {
      const prompt = `You are a video editor assistant for faceless YouTube channels. Given these sentences, extract a short, highly visual stock footage search query (3–5 words max) for each one. Be specific and cinematic. Return ONLY a JSON array, no markdown, no extra text:
[{"sentence": "...", "query": "..."}]

Sentences:
${batch.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1000 }
          })
        }
      );

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      const clean = text.replace(/```json|```/g, "").trim();

      try {
        const parsed = JSON.parse(clean);
        allResults.push(...parsed);
      } catch {
        batch.forEach(s => {
          allResults.push({
            sentence: s,
            query: s.split(" ").slice(0, 4).join(" ")
          });
        });
      }
    }

    return Response.json({ results: allResults });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
