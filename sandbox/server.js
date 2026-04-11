import express from "express";
import { execFile } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const app = express();

// Reject bodies larger than 64 KB to prevent resource exhaustion
app.use(express.json({ limit: "64kb" }));

// Only expose a single execution endpoint
app.post("/execute", (req, res) => {
  const { code, language, timeout } = req.body;

  if (!code || typeof code !== "string" || !language) {
    return res.status(400).json({ error: "Missing or invalid code/language" });
  }

  if (language !== "python" && language !== "javascript") {
    return res.status(400).json({ error: "Unsupported language" });
  }

  // Clamp timeout: minimum 1 s, maximum 10 s
  const safeTimeout = Math.min(Math.max(parseInt(timeout) || 5000, 1000), 10000);

  const ext = language === "python" ? ".py" : ".js";
  const tmpFile = join("/tmp", `sandbox_${randomUUID()}${ext}`);

  try {
    // Write with restrictive permissions — owner read/write only
    writeFileSync(tmpFile, code, { mode: 0o600 });
  } catch (writeErr) {
    return res.status(500).json({ error: "Failed to write code file" });
  }

  const cmd = language === "python" ? "python3" : "node";

  execFile(
    cmd,
    [tmpFile],
    {
      timeout: safeTimeout,
      // Cap output at 256 KB to prevent memory exhaustion
      maxBuffer: 256 * 1024,
      // Minimal environment — no inherited secrets
      env: { PATH: "/usr/local/bin:/usr/bin:/bin" },
    },
    (err, stdout, stderr) => {
      try {
        unlinkSync(tmpFile);
      } catch {}

      if (err) {
        if (err.killed || err.signal === "SIGTERM" || err.signal === "SIGKILL") {
          return res.json({ stdout: "", stderr: "", timedOut: true });
        }
        return res.json({
          stdout: stdout ?? "",
          stderr: (stderr || err.message || "").trim(),
          timedOut: false,
        });
      }

      res.json({ stdout: stdout ?? "", stderr: stderr ?? "", timedOut: false });
    }
  );
});

// Healthcheck endpoint
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(8888, "0.0.0.0", () => {
  console.log("Sandbox service running on port 8888");
});
