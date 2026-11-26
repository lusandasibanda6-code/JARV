import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
const SYSTEM_PROMPT = `You are JARVIS, a capable, calm, concise personal AI assistant.
Speak with polished, respectful confidence. Address the user naturally.
Be honest about limitations: you cannot see or control the phone, access private
data, or perform actions unless a connected tool explicitly enables it.
Never claim an action was completed when it was not.`;

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    elevenLabsConfigured: Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID)
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) return res.status(503).json({ error: "Add GROQ_API_KEY to your .env file." });
    const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
    const safeMessages = messages.slice(-20).map(m => ({
      role: ["user", "assistant"].includes(m.role) ? m.role : "user",
      content: String(m.content ?? "").slice(0, 8000)
    }));
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...safeMessages],
        temperature: 0.6,
        max_tokens: 700
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || "Groq request failed." });
    res.json({ reply: data.choices?.[0]?.message?.content || "I couldn't generate a response." });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error." });
  }
});

app.post("/api/speak", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOICE_ID) {
      return res.status(503).json({ error: "Add your ElevenLabs API key and voice ID to .env." });
    }
    if (!text || typeof text !== "string") return res.status(400).json({ error: "Text is required." });
    const voiceId = encodeURIComponent(process.env.ELEVENLABS_VOICE_ID);
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text: text.slice(0, 2500),
        model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5"
      })
    });
    if (!response.ok) {
      const detail = await response.text();
      return res.status(response.status).json({ error: detail.slice(0, 500) || "ElevenLabs request failed." });
    }
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    const audio = Buffer.from(await response.arrayBuffer());
    res.send(audio);
  } catch (error) {
    res.status(500).json({ error: error.message || "Speech generation failed." });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`JARVIS is running at http://localhost:${port}`));
