import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_AI_KEY;

if (!apiKey) {
  throw new Error("Missing GOOGLE_AI_KEY");
}

const genAI = new GoogleGenerativeAI(apiKey);

const systemPrompt = `You are CHEESA-BOT, a helpful AI assistant for the Chemical Engineering Student Association (CHEESA) at KNUST.

You provide accurate, friendly information about:
- Chemical Engineering as a discipline
- The Chemical Engineering program at KNUST
- CHEESA activities, leadership, and events
- General academic and student-life guidance

If a question is outside CHEESA’s scope, say so clearly and suggest contacting CHEESA executives.`;

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 1024,
  },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, conversationHistory = [] } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "model",
          parts: [
            {
              text: "Hello! I am the CHEESA Help Bot. How can I assist you today?",
            },
          ],
        },
        ...conversationHistory.map((m: any) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: String(m.content ?? "") }],
        })),
      ],
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("CHEESA AI error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
