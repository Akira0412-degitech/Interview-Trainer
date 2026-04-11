import "dotenv/config";
import express from "express";
import session from "express-session";
import openai from "openai";

import { WebSocketServer, WebSocket } from "ws";
import httpServer from "http";
import { prisma } from "./lib/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const client = new openai.OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const SANDBOX_URL = process.env.SANDBOX_URL || "http://localhost:8888";

const app = express();
const webSocketServer = new WebSocketServer({ noServer: true });
const server = httpServer.createServer(app);

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: true,
});

app.use(express.json());
app.use(sessionMiddleware);

// ── CORS ──────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin.startsWith("http://localhost:")) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ── Test case definitions ──────────────────────────────────────────────────
const PROBLEMS = {
  1: {
    fn: "twoSum",
    compare: "sortedArray",
    run: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
    ],
    submit: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[3, 3], 6], expected: [0, 1] },
      { args: [[1, 2, 3, 4, 5], 9], expected: [3, 4] },
      { args: [[-1, -2, -3, -4, -5], -8], expected: [2, 4] },
    ],
  },
  2: {
    fn: "isValid",
    compare: "strict",
    run: [
      { args: ["()"], expected: true },
      { args: ["()[]{}"], expected: true },
    ],
    submit: [
      { args: ["()"], expected: true },
      { args: ["()[]{}"], expected: true },
      { args: ["(]"], expected: false },
      { args: ["([)]"], expected: false },
      { args: ["{[]}"], expected: true },
      { args: [""], expected: true },
    ],
  },
};

function buildPythonHarness(code, fn, testCases, compare) {
  const tc = JSON.stringify(testCases);
  const sortedCmp = compare === "sortedArray"
    ? "sorted(list(got)) == sorted(list(tc['expected']))"
    : "got == tc['expected']";
  return `import json, sys
${code}
test_cases = ${tc}
results = []
for tc in test_cases:
    try:
        got = ${fn}(*tc['args'])
        if got is None:
            ok = False
        else:
            ok = ${sortedCmp}
    except Exception as e:
        got = str(e)
        ok = False
    results.append({'passed': ok, 'output': got, 'expected': tc['expected'], 'args': tc['args']})
print(json.dumps(results))
`;
}

function buildJSHarness(code, fn, testCases, compare) {
  const tc = JSON.stringify(testCases);
  const cmp = compare === "sortedArray"
    ? "JSON.stringify([...got].sort((a,b)=>a-b))===JSON.stringify([...tc.expected].sort((a,b)=>a-b))"
    : "JSON.stringify(got)===JSON.stringify(tc.expected)";
  return `${code}
const __cases = ${tc};
const __results = __cases.map(tc => {
  try {
    const got = ${fn}(...tc.args);
    const passed = ${cmp};
    return { passed, output: got, expected: tc.expected, args: tc.args };
  } catch(e) {
    return { passed: false, output: e.message, expected: tc.expected, args: tc.args };
  }
});
console.log(JSON.stringify(__results));
`;
}

function formatResults(results, mode) {
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const allPassed = passed === total;
  let out = allPassed
    ? mode === "submit"
      ? `✓ Accepted\n\n${total} / ${total} test cases passed`
      : `✓ All test cases passed`
    : `✗ ${passed} / ${total} test cases passed`;
  out += "\n";
  results.forEach((r, i) => {
    out += `\nTest ${i + 1}: ${r.passed ? "✓ Passed" : "✗ Failed"}\n`;
    out += `  Input:    ${JSON.stringify(r.args)}\n`;
    out += `  Expected: ${JSON.stringify(r.expected)}\n`;
    out += `  Output:   ${JSON.stringify(r.output)}\n`;
  });
  return { status: allPassed ? "accepted" : "wrong_answer", output: out };
}

// ── /api/realtime/session ─────────────────────────────────────────────────
app.post("/api/realtime/session", async (req, res) => {
 
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

// ── /api/run ──────────────────────────────────────────────────────────────
app.post("/api/run", async (req, res) => {
  const { code, language, problemId, mode = "run" } = req.body;

  const problem = PROBLEMS[problemId];
  if (!problem) {
    return res.json({
      status: "error",
      output: `Execution not configured for problem ${problemId} yet.`,
    });
  }

  if (language !== "python" && language !== "javascript") {
    return res.json({
      status: "error",
      output: `Live execution is supported for Python and JavaScript only.\nFor ${language}, test locally with your preferred compiler.`,
    });
  }

  const testCases = mode === "submit" ? problem.submit : problem.run;
  const harness = language === "python"
    ? buildPythonHarness(code, problem.fn, testCases, problem.compare)
    : buildJSHarness(code, problem.fn, testCases, problem.compare);

  try {
    const sandboxRes = await fetch(`${SANDBOX_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: harness, language, timeout: 5000 }),
      signal: AbortSignal.timeout(10000),
    });

    if (!sandboxRes.ok) {
      return res.json({ status: "error", output: "Sandbox service error" });
    }

    const { stdout, stderr, timedOut } = await sandboxRes.json();

    if (timedOut) {
      return res.json({ status: "error", output: "Time Limit Exceeded (5s)" });
    }

    if (!stdout && stderr) {
      return res.json({ status: "error", output: stderr.trim() });
    }

    try {
      const results = JSON.parse(stdout.trim());
      res.json(formatResults(results, mode));
    } catch {
      res.json({ status: "error", output: stdout || stderr || "Unexpected output" });
    }
  } catch {
    res.json({ status: "error", output: "Sandbox service unavailable" });
  }
});

// ── Problems ──────────────────────────────────────────────────────────────
app.get("/api/problems", async (req, res) => {
  const { difficulty, category } = req.query;
  const problems = await prisma.problem.findMany({
    where: {
      ...(difficulty ? { difficulty } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: { id: "asc" },
  });

  const parsed = problems.map((p) => ({
    ...p,
    hints: p.hints,
    testCases: p.testCases,
  }));

  res.json(parsed);
});

app.get("/api/problems/:id", async (req, res) => {
  const problem = await prisma.problem.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!problem) return res.status(404).json({ error: "Problem not found" });

  res.json({
    ...problem,
    hints: JSON.parse(problem.hints),
    testCases: JSON.parse(problem.testCases),
  });
});

// ── Auth ──────────────────────────────────────────────────────────────────
app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: "name, email, password are required" });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return res.status(409).json({ error: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" }
  );

  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.post("/api/auth/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "email and password are required" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    return res.status(401).json({ error: "Invalid email or password" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid)
    return res.status(401).json({ error: "Invalid email or password" });

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" }
  );

  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

// ── WebSocket ─────────────────────────────────────────────────────────────

function handleUpgrade(request, socket, head) {
  sessionMiddleware(request, {}, () => {
    webSocketServer.handleUpgrade(request, socket, head, (ws) => {
      webSocketServer.emit("connection", ws, request);
    });
  });
}

webSocketServer.on("connection", (ws, request) => {
  const sess = request.session;

  ws.on("message", async (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      switch (parsedMessage.type) {
        case "code":
          sess.code = parsedMessage.code;
          break;
      }
    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(JSON.stringify({ error: "An error occurred." }));
    }
  });
});

server.on("upgrade", (request, socket, head) => {
  if (request.url === "/api/session") {
    handleUpgrade(request, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(8080, () => {
  console.log("Server running on port 8080");
});
