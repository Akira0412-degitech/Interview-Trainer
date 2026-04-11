import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

// In-memory code store keyed by session id
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

// ── OpenAI Realtime server-side relay ─────────────────────────────────────────
// Connects to OpenAI Realtime API on behalf of the client.
// The client never receives the OpenAI key or has access to the data channel.
// Function calls (e.g. read_code) are resolved here using the server-stored
// code snapshot, making them tamper-proof.
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

    // Configure the session  
    oaiWs.send(
      JSON.stringify({
        type: "session.update",
        session: {
          voice: "alloy",
          instructions: `You are a coding interviewer from a company. Your personality is ${session.personality}. Conduct a coding interview with the candidate. Ask clarifying questions, provide hints if asked, and give feedback at the end.
The problem you are interviewing the candidate on is: ${session.problem.title} - ${session.problem.description}
The difficulty level of the problem is ${session.problem.difficulty}. Tailor your questions and hints based on this difficulty.
When the candidate asks for feedback on their code or you want to comment on their approach, use the read_code function to read the code when needed.`,
          turn_detection: { type: "server_vad" },
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          tools: [
            {
              type: "function",
              name: "read_code",
              description:
                "Read the candidate's current code. Call this when you need to see their code to provide feedback or hints.",
              parameters: { type: "object", properties: {}, required: [] },
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
