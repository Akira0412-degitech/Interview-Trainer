import express from "express";
import { exec } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import path from "path";

const app = express();
app.use(express.json());

app.post("/execute", (req, res) => {
  const { code, language, timeout = 5000 } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: "Missing code or language" });
  }

  const id = randomUUID();
  let filePath, command;

  try {
    if (language === "python") {
      filePath = path.join(tmpdir(), `${id}.py`);
      writeFileSync(filePath, code);
      command = `python3 "${filePath}"`;
    } else if (language === "javascript") {
      filePath = path.join(tmpdir(), `${id}.js`);
      writeFileSync(filePath, code);
      command = `node "${filePath}"`;
    } else {
      return res.json({ stdout: "", stderr: `Language '${language}' not supported in sandbox.`, timedOut: false });
    }

    const timer = setTimeout(() => {}, 0); // placeholder
    clearTimeout(timer);

    exec(command, { timeout, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      // Cleanup temp file
      try { unlinkSync(filePath); } catch {}

      if (err && err.killed) {
        return res.json({ stdout: "", stderr: "", timedOut: true });
      }

      res.json({
        stdout: stdout || "",
        stderr: err ? (stderr || err.message) : (stderr || ""),
        timedOut: false,
      });
    });
  } catch (e) {
    try { if (filePath) unlinkSync(filePath); } catch {}
    res.json({ stdout: "", stderr: String(e), timedOut: false });
  }
});

app.listen(8888, () => {
  console.log("Sandbox running on port 8888");
});
