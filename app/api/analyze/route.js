export async function POST(req) {
  try {
    const { sentences } = await req.json();

    const stopWords = new Set([
      "a","an","the","is","are","was","were","be","been","being","have","has","had",
      "do","does","did","will","would","could","should","may","might","shall","can",
      "to","of","in","on","at","by","for","with","about","against","between","into",
      "through","during","before","after","above","below","from","up","down","out",
      "and","but","or","nor","so","yet","both","either","neither","not","no",
      "this","that","these","those","it","its","i","you","he","she","we","they",
      "what","which","who","whom","there","here","when","where","why","how",
      "all","each","every","both","few","more","most","other","some","such",
      "just","than","then","also","very","too","now","only","even","still"
    ]);

    const results = sentences.map((sentence) => {
      const words = sentence
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopWords.has(w));

      const query = words.slice(0, 4).join(" ") || sentence.split(" ").slice(0, 3).join(" ");

      return { sentence, query };
    });

    return Response.json({ results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
