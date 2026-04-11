import "dotenv/config";
import express from "express";
import session from "express-session";
import httpServer from "http";
import { prisma } from "./lib/prisma.js";

import OpenAI from "openai";

import authRouter from "./routes/auth.js";
import problemsRouter from "./routes/problems.js";
import runRouter from "./routes/run.js";
import realtimeRouter from "./routes/realtime.js";
import { createWebSocketServer } from "./ws/index.js";
import { authMiddleware } from "./lib/auth.js";
import cookieParser from "cookie-parser";
const app = express();

app.set("trust proxy", 1);
app.use(cookieParser()); 
const server = httpServer.createServer(app);


app.use(express.json());



// ── Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use(authMiddleware); // all routes below require authentication
app.use("/api/problems", problemsRouter);
app.use("/api/run", runRouter);
app.use("/api/realtime", realtimeRouter);



// ── Sessions ──────────────────────────────────────────────────────────────

// Session started
app.post("/api/session", async (req, res) => {
  const { personality, difficulty } = req.body;

  if (!personality || !difficulty)
    return res.status(400).json({ error: "personality and difficulty are required" });

  const validPersonalities = ["friendly", "strict", "neutral"];
  if (!validPersonalities.includes(personality))
    return res.status(400).json({ error: "personality must be friendly, strict, or neutral" });

  const validDifficulties = ["easy", "medium", "hard"];
  if (!validDifficulties.includes(difficulty))
    return res.status(400).json({ error: "difficulty must be easy, medium, or hard" });

  const problems = await prisma.problem.findMany({
    where: difficulty ? { difficulty } : {},
  });
  if (problems.length === 0)
    return res.status(404).json({ error: "Problem not found" });

  const problem = problems[Math.floor(Math.random() * problems.length)];

  const session = await prisma.session.create({
    data: {
      userId:    req.user.userId,
      problemId: problem.id,
      personality,


    },
  });


  res.status(201).json({ sessionId: session.id });
});

// // Session ended and GPT feedback requested
// app.patch("/api/sessions/:id/end", async (req, res) => {
//   const { transcript, finalCode } = req.body;

  
//   const existing = await prisma.session.findUnique({
//     where: { id: Number(req.params.id) },
//     include: { problem: true },
//   });

//   if (!existing)
//     return res.status(404).json({ error: "Session not found" });
//   if (existing.userId !== req.user.userId)
//     return res.status(403).json({ error: "Forbidden" });
//   if (existing.endedAt)
//     return res.status(400).json({ error: "Session already ended" });

//   //Ask GPT for feedback and score
//   let feedback = null;
//   let score = null;

//   try {
//     const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

//     const prompt = `
// You are a coding interview evaluator.

// Problem: ${existing.problem.title}
// Description: ${existing.problem.description}
// Personality: ${existing.personality}

// The candidate's final code:
// \`\`\`
// ${finalCode ?? "No code submitted"}
// \`\`\`

// Interview transcript:
// ${transcript ?? "No transcript available"}

// Please evaluate the candidate and respond in JSON format:
// {
//   "score": <integer 0-100>,
//   "feedback": "<detailed feedback in 2-3 paragraphs covering code quality, problem solving approach, and communication>"
// }
// `;

//     const completion = await openaiClient.chat.completions.create({
//       model: "gpt-4o",
//       messages: [{ role: "user", content: prompt }],
//       response_format: { type: "json_object" },
//     });

//     const result = JSON.parse(completion.choices[0].message.content);
//     feedback = result.feedback ?? null;
//     score    = result.score    ?? null;

//   } catch (err) {
//     console.error("GPT feedback generation failed:", err);
    
//   }

//   // save in DB
//   const session = await prisma.session.update({
//     where: { id: Number(req.params.id) },
//     data: {
//       endedAt:    new Date(),
//       transcript: transcript ?? null,
//       feedback,
//       score,
//     },
//   });

//   res.json(session);
// });

// // Get sessions (with problem details) for the authenticated user
// app.get("/api/sessions/:id", async (req, res) => {
//   const session = await prisma.session.findUnique({
//     where: { id: Number(req.params.id) },
//     include: { problem: true },
//   });

//   if (!session)
//     return res.status(404).json({ error: "Session not found" });
//   if (session.userId !== req.user.userId)
//     return res.status(403).json({ error: "Forbidden" });

//   res.json(session);
// });

// // Use all history sessions
// app.get("/api/users/me/sessions", async (req, res) => {
//   const sessions = await prisma.session.findMany({
//     where:   { userId: req.user.userId },
//     include: { problem: true },
//     orderBy: { startedAt: "desc" },
//   });

//   res.json(sessions);
// });


// ── WebSocket ─────────────────────────────────────────────────────────────
createWebSocketServer(server);

server.listen(8080, () => {
  console.log("Server running on port 8080");
});
