import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ================= HEALTH CHECK (for dashboard) =================
app.get("/health", (req, res) => {
  res.json({
    ai: !!process.env.OPENAI_API_KEY,
    status: "running"
  });
});

// ================= LOCAL FALLBACK =================
function generateLocalFeedback(metrics) {
  return `
Performance Analysis:

• Eye Contact: ${metrics.eyeContact}
• Smile: ${metrics.smile}
• Nervous Movement: ${metrics.nervous}

Keep practicing to improve consistency and confidence.
`;
}

// ================= PRACTICE MODE AI =================
app.post("/generate-feedback", async (req, res) => {
  const { metrics } = req.body;

  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `Analyze interview performance and give feedback:
Eye Contact: ${metrics.eyeContact}
Smile: ${metrics.smile}
Nervous Movement: ${metrics.nervous}`
    });

    res.json({ feedback: response.output_text });

  } catch {
    res.json({
      feedback: generateLocalFeedback(metrics),
      source: "fallback"
    });
  }
});

// ================= STUDY CHAT =================
app.post("/study-chat", async (req, res) => {
  const { question } = req.body;

  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `Explain clearly for a student:\n${question}`
    });

    res.json({ reply: response.output_text });

  } catch {
    res.json({
      reply: "Review fundamentals or textbooks for this topic."
    });
  }
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
