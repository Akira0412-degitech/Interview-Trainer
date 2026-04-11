import { Router } from "express";

const router = Router();

router.post("/session", async (req, res) => {
  try {
    const sessionRes = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        instructions: "You are a coding interviewer from a company.",
        turn_detection: { type: "server_vad" },
      }),
    });

    if (!sessionRes.ok) {
      const errText = await sessionRes.text();
      return res.status(sessionRes.status).json({ error: errText });
    }

    const session = await sessionRes.json();
    res.json({ client_secret: session.client_secret });
  } catch (err) {
    console.error("Realtime session error:", err);
    res.status(500).json({ error: "Failed to create realtime session" });
  }
});

export default router;
