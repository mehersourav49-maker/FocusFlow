async function callOpenAI(input) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.output_text || "";
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const question = req.body?.question || "";

  try {
    const reply = await callOpenAI(`Explain clearly for a student:\n${question}`);
    return res.status(200).json({ reply });
  } catch {
    return res.status(200).json({ reply: "Review fundamentals or textbooks for this topic." });
  }
};
