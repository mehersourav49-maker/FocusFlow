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

function generateLocalFeedback(metrics) {
  return `\nPerformance Analysis:\n\n- Eye Contact: ${metrics.eyeContact}\n- Smile: ${metrics.smile}\n- Nervous Movement: ${metrics.nervous}\n\nKeep practicing to improve consistency and confidence.\n`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const metrics = req.body?.metrics || {};

  try {
    const feedback = await callOpenAI(
      `Analyze interview performance and give feedback:\nEye Contact: ${metrics.eyeContact}\nSmile: ${metrics.smile}\nNervous Movement: ${metrics.nervous}`
    );

    return res.status(200).json({ feedback });
  } catch {
    return res.status(200).json({ feedback: generateLocalFeedback(metrics), source: "fallback" });
  }
};
