export async function POST(req) {
  try {
    const { sentences, batchSize, groqKey } = await req.json();

    if (!groqKey || !groqKey.trim()) {
      return Response.json({ error: "Groq API key is required." }, { status: 400 });
    }

    const batches = [];
    for (let i = 0; i < sentences.length; i += batchSize) {
      batches.push(sentences.slice(i, i + batchSize));
    }

    const allResults = [];

    for (const batch of batches) {
      const prompt = `You are a video editor assistant for faceless YouTube channels. Given these sentences, extract a short, highly visual stock footage search query (3-5 words max) for each one. Be specific and cinematic. Return ONLY a valid JSON array, no markdown, no explanation, no extra text. Example format:
[{"sentence": "exact sentence here", "query": "cinematic search query"}]

Sentences:
${batch.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey.trim()}`
        },
        body: JSON.stringify({
          "model": "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000,
          temperature: 0.3
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Groq API error");
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "[]";
      const clean = text.replace(/```json|```/g, "").trim();

      try {
        const parsed = JSON.parse(clean);
        allResults.push(...parsed);
      } catch {
        batch.forEach(s => {
          allResults.push({
            sentence: s,
            query: s.replace(/[^a-zA-Z0-9\s]/g, "").split(" ").slice(0, 4).join(" ")
          });
        });
      }
    }

    return Response.json({ results: allResults });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
