import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import OpenAI from "openai";
import { prisma } from "../lib/prisma.js";

// In-memory session state keyed by session id
// Stores: { code, mainWs, transcript, ended }
const sessions = new Map();

// ── Auth helper ───────────────────────────────────────────────────────────────
function extractToken(request) {
  const rawCookies = request.headers.cookie || "";
  return rawCookies
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("token="))
    ?.split("=")[1];
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
  } catch {
    return null;
  }
}

// ── Interviewer personas ───────────────────────────────────────────────────────
const INTERVIEWER_NAMES = { friendly: "Alex", neutral: "Jordan", strict: "Morgan" };

const PERSONA_DESCRIPTIONS = {
  friendly: `Your name is Alex. You are warm, encouraging, and patient. You give hints freely when the candidate is stuck. You celebrate good ideas and offer positive reinforcement. You want the candidate to succeed and create a comfortable atmosphere.`,
  neutral: `Your name is Jordan. You are professional and balanced. You give occasional nudges only when the candidate is clearly stuck for an extended period. You ask probing follow-up questions to test understanding and don't hand-hold, but you are fair.`,
  strict: `Your name is Morgan. You are exacting and demanding. You rarely give hints — the candidate must earn them by articulating what they've already tried. You push back on every design decision and expect optimal, well-justified solutions. You create mild time pressure while remaining professional.`,
};

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(session) {
  const name = INTERVIEWER_NAMES[session.personality] ?? "Jordan";
  const persona = PERSONA_DESCRIPTIONS[session.personality] ?? PERSONA_DESCRIPTIONS.neutral;

  return `${persona}

You work as a software engineer at Meridian Technologies and are conducting a technical coding interview today.

THE PROBLEM YOU ARE GIVING THE CANDIDATE:
Title: ${session.problem.title}
Difficulty: ${session.problem.difficulty}
Description: ${session.problem.description}

INTERVIEW STRUCTURE — follow these phases strictly in order:

PHASE 1 — INTRODUCTION (2–3 minutes)
- Open by greeting the candidate naturally. Introduce yourself: "Hi, I'm ${name}, a software engineer here at Meridian."
- Brief warmup: ask how they are doing today.
- Set the format: mention the session will be about 45 minutes — a coding problem, time for questions, then coding and a short discussion at the end.
- Keep the intro short and conversational.

PHASE 2 — PROBLEM PRESENTATION
- Transition naturally: "Alright, let's get into it."
- Present the problem title and describe what it asks in plain, spoken language. Do NOT read out JSON, code, or formatting — just describe the problem as a human would.
- Say: "Take a moment to read through the problem on your screen. Feel free to ask me any clarifying questions before you start coding."
- Wait for the candidate to respond before continuing.

PHASE 3 — CLARIFICATIONS
- Answer any clarifying questions the candidate asks. Act like a real interviewer — answer only what is clarifiable (input constraints, return format, edge case assumptions), not how to solve it.
- If the candidate has no questions after a natural pause, ask: "Any questions before you dive in?"
- Once clarifications are done: "Great, go ahead and start coding whenever you're ready."

PHASE 4 — CODING PHASE (main phase, ~20 minutes)
- Stay MOSTLY SILENT while the candidate codes. Do NOT speak after every line they say.
- Only speak if: (a) they explicitly ask for help, (b) they have been silent for a long time and seem stuck, or (c) you want a brief non-intrusive check-in.
- If they ask for a hint, respond based on your personality — Alex gives it freely, Jordan nudges, Morgan makes them justify what they've tried first.
- If they appear to have finished or start explaining their solution, acknowledge it and transition to Phase 5.
- Occasional, brief check-ins are fine: "How's it going?" or "Feel free to think out loud."

PHASE 5 — SOLUTION REVIEW & WRAP-UP (~8 minutes)
- Ask them to walk through their solution: "Can you walk me through your approach?"
- Ask: "What would you say the time complexity is? And space complexity?"
- Ask: "Are there any edge cases we should consider?"
- Based on your personality, optionally probe for optimizations or alternative approaches.
- Wrap up warmly: "Great, I think that covers everything we had planned. Do you have any questions for me?"
- Answer any candidate questions briefly and naturally.
- Sign off: "Thanks so much for your time today — it was great chatting with you. We'll be in touch soon about next steps. Take care!"
- Then immediately call the end_interview function to close the session.

IMPORTANT RULES:
- This is a VOICE conversation — speak naturally, use contractions, avoid reading out symbols or code formatting.
- Keep each spoken turn SHORT: 2–4 sentences max. Never monologue.
- Do NOT skip ahead or compress phases — let each phase breathe naturally.
- Maintain your personality consistently throughout.
- Do NOT call end_interview until you have genuinely completed Phase 5 and said your goodbye.
- When calling read_code, do not announce it to the candidate — just silently read the code and incorporate it into your response.`;
}

// ── GPT feedback generation ───────────────────────────────────────────────────
async function generateFeedback(session, finalCode, transcript) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const transcriptText = transcript
    .map((t) => `${t.role === "ai" ? "Interviewer" : "Candidate"}: ${t.content}`)
    .join("\n");

  const prompt = `You are a senior engineering interview evaluator at a top tech company.

Problem: ${session.problem.title} (${session.problem.difficulty})
Description: ${session.problem.description}

Final code submitted by candidate:
\`\`\`
${finalCode || "No code written"}
\`\`\`

Interview transcript:
${transcriptText || "No transcript available"}

Evaluate the candidate and respond in this exact JSON format:
{
  "score": <integer 0-100>,
  "feedback": "<3–4 paragraphs: problem-solving approach, code quality, communication, and specific areas for improvement>",
  "subScores": [
    { "category": "Problem Understanding", "score": <0-100>, "max": 100 },
    { "category": "Code Quality", "score": <0-100>, "max": 100 },
    { "category": "Communication", "score": <0-100>, "max": 100 },
    { "category": "Algorithm Efficiency", "score": <0-100>, "max": 100 },
    { "category": "Edge Case Handling", "score": <0-100>, "max": 100 }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const result = JSON.parse(completion.choices[0].message.content);
    return {
      score: result.score ?? null,
      feedback: result.feedback ?? null,
      subScores: result.subScores ?? null,
    };
  } catch (err) {
    console.error("Feedback generation failed:", err);
    return { score: null, feedback: null, subScores: null };
  }
}

// ── End interview flow ────────────────────────────────────────────────────────
async function endInterview(session) {
  const sessionData = sessions.get(session.id) || {};

  // Guard against double-ending
  if (sessionData.ended) return;
  sessionData.ended = true;
  sessions.set(session.id, sessionData);

  const finalCode = sessionData.code || "";
  const transcript = sessionData.transcript || [];
  const mainWs = sessionData.mainWs;

  // Tell client we're generating feedback
  if (mainWs?.readyState === WebSocket.OPEN) {
    mainWs.send(JSON.stringify({ type: "generating_feedback" }));
  }

  const { score, feedback, subScores } = await generateFeedback(session, finalCode, transcript);

  await prisma.session.update({
    where: { id: session.id },
    data: {
      endedAt: new Date(),
      transcript: JSON.stringify(transcript),
      feedback,
      score,
      subScores: subScores ?? undefined,
    },
  });

  if (mainWs?.readyState === WebSocket.OPEN) {
    mainWs.send(JSON.stringify({ type: "interview_ended" }));
  }
}

// ── OpenAI Realtime server-side relay ─────────────────────────────────────────
// Connects to OpenAI Realtime API on behalf of the client.
// The client never receives the OpenAI key or has access to the data channel.
// Function calls (read_code, end_interview) are resolved server-side using the
// server-stored code snapshot, making them tamper-proof.
function handleAudioConnection(clientWs, session) {
  const oaiWs = new WebSocket(
    "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1",
      },
    }
  );

  let speakingStartSent = false;
  // Buffer audio input that arrives before the OpenAI WS is open
  const pendingAudio = [];
  let oaiReady = false;

  oaiWs.on("open", () => {
    oaiReady = true;

    oaiWs.send(
      JSON.stringify({
        type: "session.update",
        session: {
          voice: "alloy",
          instructions: buildSystemPrompt(session),
          turn_detection: { type: "server_vad" },
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: { model: "whisper-1" },
          tools: [
            {
              type: "function",
              name: "read_code",
              description:
                "Silently read the candidate's current code from the editor. Use this when you want to review their work to provide feedback or hints.",
              parameters: { type: "object", properties: {}, required: [] },
            },
            {
              type: "function",
              name: "end_interview",
              description:
                "End the interview session. Call this ONLY after you have completed Phase 5, said your goodbye, and the candidate has had a chance to ask questions. Calling this closes the session and triggers feedback generation.",
              parameters: { type: "object", properties: {}, required: [] },
            },
            {
              type: "function",
              name: "type_in_editor",
              description:
                "Type text or code into the candidate's editor with a human-like typing animation. Use this to write example code, add comments, annotate the candidate's code, or demonstrate a concept. The text will appear character-by-character as if a human is typing. Do NOT announce you are doing this — just call it silently.",
              parameters: {
                type: "object",
                properties: {
                  content: {
                    type: "string",
                    description: "The text or code to type into the editor, e.g. a comment like '# Two-pointer approach' or a code snippet.",
                  },
                },
                required: ["content"],
              },
            },
          ],
          tool_choice: "auto",
        },
      })
    );

    // Flush buffered audio
    for (const audio of pendingAudio) {
      oaiWs.send(JSON.stringify({ type: "input_audio_buffer.append", audio }));
    }
    pendingAudio.length = 0;

    clientWs.send(JSON.stringify({ type: "agent_ready" }));
  });

  oaiWs.on("message", (data) => {
    let event;
    try {
      event = JSON.parse(data.toString());
    } catch {
      return;
    }

    switch (event.type) {
      case "input_audio_buffer.speech_started": {
        // User started speaking — cancel any in-progress AI response to avoid
        // unnatural response stacking (mimics real interruption behaviour)
        oaiWs.send(JSON.stringify({ type: "response.cancel" }));
        if (speakingStartSent) {
          // Tell client to immediately stop and discard buffered audio
          clientWs.send(JSON.stringify({ type: "interrupt" }));
          clientWs.send(JSON.stringify({ type: "speaking_end" }));
          speakingStartSent = false;
        }
        break;
      }
      case "response.audio.delta": {
        // Forward audio chunk to client
        clientWs.send(JSON.stringify({ type: "audio_output", audio: event.delta }));
        if (!speakingStartSent) {
          clientWs.send(JSON.stringify({ type: "speaking_start" }));
          speakingStartSent = true;
        }
        break;
      }
      case "response.audio.done":
      case "response.done": {
        if (speakingStartSent) {
          clientWs.send(JSON.stringify({ type: "speaking_end" }));
          speakingStartSent = false;
        }
        break;
      }
      case "response.audio_transcript.done": {
        // Track AI spoken turn in transcript
        if (event.transcript) {
          const sessionData = sessions.get(session.id) || {};
          if (!sessionData.transcript) sessionData.transcript = [];
          sessionData.transcript.push({
            role: "ai",
            content: event.transcript,
            timestamp: new Date().toISOString(),
          });
          sessions.set(session.id, sessionData);
        }
        break;
      }
      case "conversation.item.input_audio_transcription.completed": {
        // Track candidate spoken turn in transcript
        if (event.transcript) {
          const sessionData = sessions.get(session.id) || {};
          if (!sessionData.transcript) sessionData.transcript = [];
          sessionData.transcript.push({
            role: "user",
            content: event.transcript,
            timestamp: new Date().toISOString(),
          });
          sessions.set(session.id, sessionData);
        }
        break;
      }
      case "response.function_call_arguments.done": {
        if (event.name === "read_code") {
          // Read code from server-side store – client cannot tamper with this
          const code = sessions.get(session.id)?.code ?? "";
          oaiWs.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: event.call_id,
                output: code || "// No code written yet",
              },
            })
          );
          oaiWs.send(JSON.stringify({ type: "response.create" }));
        } else if (event.name === "type_in_editor") {
          let args = {};
          try { args = JSON.parse(event.arguments || "{}"); } catch { /**/ }
          const content = typeof args.content === "string" ? args.content : "";
          const sessionData = sessions.get(session.id);
          const mainWs = sessionData?.mainWs;
          if (mainWs?.readyState === WebSocket.OPEN) {
            mainWs.send(JSON.stringify({ type: "ai_typing", content }));
          }
          oaiWs.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: event.call_id,
                output: "Typed into the editor successfully.",
              },
            })
          );
          oaiWs.send(JSON.stringify({ type: "response.create" }));
        } else if (event.name === "end_interview") {
          // Acknowledge the function call to the model
          oaiWs.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: event.call_id,
                output: "Interview session ended successfully.",
              },
            })
          );
          // Trigger end flow asynchronously
          endInterview(session).catch(console.error);
        }
        break;
      }
    }
  });

  // Forward mic audio from client to OpenAI
  clientWs.on("message", (message) => {
    try {
      const msg = JSON.parse(message.toString());
      if (msg.type === "audio_input") {
        if (oaiReady) {
          oaiWs.send(
            JSON.stringify({ type: "input_audio_buffer.append", audio: msg.audio })
          );
        } else {
          pendingAudio.push(msg.audio);
        }
      }
    } catch {
      // ignore malformed messages
    }
  });

  // Tear down both connections together
  const closeOai = () => { try { oaiWs.close(); } catch { /**/ } };
  const closeClient = () => { try { clientWs.close(); } catch { /**/ } };
  clientWs.on("close", closeOai);
  clientWs.on("error", closeOai);
  oaiWs.on("close", closeClient);
  oaiWs.on("error", closeClient);
}

// ── WebSocket servers ─────────────────────────────────────────────────────────
export function createWebSocketServer(server) {
  // Session-management WebSocket (/api/connect/:id)
  const wss = new WebSocketServer({ noServer: true });

  // Audio-relay WebSocket (/api/audio/:id)
  const audioWss = new WebSocketServer({ noServer: true });

  // ── /api/connect/:id ──────────────────────────────────────────────────────
  wss.on("connection", async (ws, request, session) => {
    const userId = request.user?.userId;
    if (!userId) {
      ws.send(JSON.stringify({ error: "Unauthorized" }));
      return ws.close();
    }

    // Store main WS reference so the audio relay can send events to this client
    const sessionData = sessions.get(session.id) || {};
    sessionData.mainWs = ws;
    sessions.set(session.id, sessionData);

    // Send problem data so the client can render the editor
    ws.send(
      JSON.stringify({
        type: "agent_ready",
        problem: session.problem,
      })
    );

    ws.on("message", async (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        switch (parsedMessage.type) {
          case "code": {
            // Store the latest code snapshot server-side
            const userSess = sessions.get(session.id) || {};
            userSess.code = parsedMessage.code;
            sessions.set(session.id, userSess);
            break;
          }
          case "end_interview": {
            // User manually ended the interview via the UI button
            endInterview(session).catch(console.error);
            break;
          }
        }
      } catch (error) {
        console.error("Error processing message:", error);
        ws.send(JSON.stringify({ error: "An error occurred." }));
      }
    });
  });

  // ── /api/audio/:id ────────────────────────────────────────────────────────
  audioWss.on("connection", (ws, request, session) => {
    const userId = request.user?.userId;
    if (!userId) {
      ws.send(JSON.stringify({ error: "Unauthorized" }));
      return ws.close();
    }
    handleAudioConnection(ws, session);
  });

  // ── HTTP Upgrade router ───────────────────────────────────────────────────
  server.on("upgrade", async (request, socket, head) => {
    const connectMatch = request.url.match(/^\/api\/connect\/(.+)$/);
    const audioMatch = request.url.match(/^\/api\/audio\/(.+)$/);

    const routeMatch = connectMatch || audioMatch;
    if (!routeMatch) {
      socket.destroy();
      return;
    }

    const sessionId = routeMatch[1];

    const session = await prisma.session.findUnique({
      where: { id: Number(sessionId) },
      include: { problem: true },
    });
    if (!session) {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }

    const token = extractToken(request);
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    request.user = { userId: decoded.userId };

    if (connectMatch) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request, session);
      });
    } else {
      audioWss.handleUpgrade(request, socket, head, (ws) => {
        audioWss.emit("connection", ws, request, session);
      });
    }
  });

  return wss;
}
