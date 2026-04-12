"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { VoiceAgent } from "../../components/VoiceAgent";
import { useParams, useRouter } from "next/navigation";
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type Difficulty = "easy" | "medium" | "hard";
type Language = "python" | "javascript" | "typescript" | "java" | "cpp";

interface TestCase {
  input: Record<string, unknown>;
  expected: unknown;
}

interface Problem {
  id: number;
  title: string;
  difficulty: Difficulty;
  category: string;
  description: string;
  hints: string[];
  testCases: TestCase[];
}

function generateStarterCode(language: Language, title: string): string {
  const fn = title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
  switch (language) {
    case "python":     return `def ${fn}():\n    pass\n`;
    case "javascript": return `var ${fn} = function() {\n    \n};\n`;
    case "typescript": return `function ${fn}(): void {\n    \n}\n`;
    case "java":       return `class Solution {\n    public void ${fn}() {\n        \n    }\n}\n`;
    case "cpp":        return `class Solution {\npublic:\n    void ${fn}() {\n        \n    }\n};\n`;
  }
}

const difficultyColor: Record<Difficulty, string> = {
  easy: "text-emerald-400",
  medium: "text-yellow-400",
  hard: "text-red-400",
};

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
];

const MONACO_LANG: Record<Language, string> = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  java: "java",
  cpp: "cpp",
};

// ── Resizable divider hook ────────────────────────────────────────────────────
function useHorizontalResize(initialPct: number) {
  const [leftPct, setLeftPct] = useState(initialPct);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(Math.max(pct, 15), 75));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const onDividerMouseDown = useCallback(() => { dragging.current = true; }, []);
  return { leftPct, containerRef, onDividerMouseDown };
}

function useVerticalResize(initialPx: number) {
  const [consolePx, setConsolePx] = useState(initialPx);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const fromBottom = rect.bottom - e.clientY;
      setConsolePx(Math.min(Math.max(fromBottom, 80), rect.height - 120));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const onDividerMouseDown = useCallback(() => { dragging.current = true; }, []);
  return { consolePx, containerRef, onDividerMouseDown };
}

// ── Description panel ─────────────────────────────────────────────────────────
function DescriptionPanel({ problem }: { problem: Problem | null }) {
  if (!problem) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <span className="inline-block w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
          Loading problem…
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-5 space-y-5">
      {/* Title + difficulty */}
      <div>
        <h1 className="text-xl font-semibold text-white mb-1">
          {problem.title}
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-sm font-medium capitalize ${difficultyColor[problem.difficulty]}`}>
            {problem.difficulty}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300 capitalize">
            {problem.category}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="text-sm text-zinc-300 leading-relaxed space-y-2">
        {problem.description.split("\n").map((line, i) => (
          <p key={i} dangerouslySetInnerHTML={{
            __html: line
              .replace(/`([^`]+)`/g, '<code class="bg-zinc-700 text-orange-300 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
              .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>"),
          }} />
        ))}
      </div>

      {/* Test cases as examples */}
      {problem.testCases.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-zinc-300">Examples</p>
          {problem.testCases.map((tc, i) => (
            <div key={i} className="rounded-lg bg-zinc-800 p-4 text-sm space-y-1">
              <p className="text-zinc-400 font-medium text-xs uppercase tracking-wide mb-2">Example {i + 1}</p>
              <div className="font-mono text-xs space-y-1">
                <p><span className="text-zinc-400">Input: </span><span className="text-zinc-200">{JSON.stringify(tc.input)}</span></p>
                <p><span className="text-zinc-400">Output: </span><span className="text-zinc-200">{JSON.stringify(tc.expected)}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hints */}
      {problem.hints.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-zinc-300 mb-2">Hints</p>
          <ul className="space-y-1">
            {problem.hints.map((h, i) => (
              <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                <span className="text-zinc-600 mt-0.5">•</span> {h}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [activeProblem, setActiveProblem] = useState<Problem | null>(null);
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState<string>("");
  const [runResult, setRunResult] = useState<{
    status: "idle" | "running" | "accepted" | "wrong_answer" | "error";
    output?: string;
  }>({ status: "idle" });

  const [generatingFeedback, setGeneratingFeedback] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const codeRef = useRef<string>(code);
  const codeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monacoRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiDecoIdsRef = useRef<any[]>([]);
  const aiTypingActiveRef = useRef(false);

  useEffect(() => { codeRef.current = code; }, [code]);

  const handleEditorMount = useCallback((editor: unknown, monaco: unknown) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  }, []);

  const startAiTyping = useCallback(async (content: string) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || aiTypingActiveRef.current) return;
    aiTypingActiveRef.current = true;
    setAiTyping(true);

    const model = editor.getModel();
    if (!model) { aiTypingActiveRef.current = false; setAiTyping(false); return; }

    // Prepend a newline separator if the editor already has content
    const existing = model.getValue();
    const insertContent = existing && !existing.endsWith("\n") ? "\n" + content : content;

    const startLineNumber = model.getLineCount();

    for (let i = 0; i < insertContent.length; i++) {
      const ch = insertContent[i];
      const lineCount = model.getLineCount();
      const lastCol = model.getLineLength(lineCount) + 1;
      const pos = new monaco.Range(lineCount, lastCol, lineCount, lastCol);

      editor.executeEdits("ai-typing", [{ range: pos, text: ch, forceMoveMarkers: true }]);

      // Move native cursor to where AI is typing
      const newLineCount = model.getLineCount();
      const newLastCol = model.getLineLength(newLineCount) + 1;
      editor.setPosition({ lineNumber: newLineCount, column: newLastCol });
      editor.revealPosition({ lineNumber: newLineCount, column: newLastCol });

      // Highlight AI-typed region with orange tint
      aiDecoIdsRef.current = editor.deltaDecorations(aiDecoIdsRef.current, [{
        range: new monaco.Range(startLineNumber, 1, newLineCount, newLastCol),
        options: { inlineClassName: "ai-typed-highlight", isWholeLine: false },
      }]);

      // Human-like variable delay
      const delay =
        ch === "\n" ? 140 + Math.random() * 120
        : ch === " " ? 55 + Math.random() * 35
        : ",;(){}[]".includes(ch) ? 80 + Math.random() * 60
        : 35 + Math.random() * 45;
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }

    // Sync final code state and push to server
    const finalCode = model.getValue();
    setCode(finalCode);
    codeRef.current = finalCode;
    wsRef.current?.send(JSON.stringify({ type: "code", code: finalCode }));

    // Fade out decoration after a moment
    setTimeout(() => {
      if (editorRef.current) {
        aiDecoIdsRef.current = editorRef.current.deltaDecorations(aiDecoIdsRef.current, []);
      }
    }, 2500);

    aiTypingActiveRef.current = false;
    setAiTyping(false);
  }, []);

  const router = useRouter();
  const params = useParams();
  const { sessionId } = params;

  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.host}/api/connect/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "agent_ready": {
          const problem: Problem = {
            ...message.problem,
            hints: Array.isArray(message.problem.hints) ? message.problem.hints : JSON.parse(message.problem.hints ?? "[]"),
            testCases: Array.isArray(message.problem.testCases) ? message.problem.testCases : JSON.parse(message.problem.testCases ?? "[]"),
          };
          setActiveProblem(problem);
          // Restore saved code if resuming, otherwise generate starter code
          setCode(message.savedCode ?? generateStarterCode("python", problem.title));
          // Initialize elapsed from the persisted session start time
          const initialElapsed = message.startedAt
            ? Math.max(0, Math.floor((Date.now() - new Date(message.startedAt).getTime()) / 1000))
            : 0;
          setElapsed(initialElapsed);
          timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
          break;
        }
        case "generating_feedback": {
          if (timerRef.current) clearInterval(timerRef.current);
          setGeneratingFeedback(true);
          break;
        }
        case "interview_ended": {
          if (timerRef.current) clearInterval(timerRef.current);
          router.push(`/feedback/${sessionId}`);
          break;
        }
        case "ai_typing": {
          startAiTyping(message.content);
          break;
        }
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      if (codeDebounceRef.current) clearTimeout(codeDebounceRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      ws.close();
      wsRef.current = null;
    };

  }, [sessionId, startAiTyping]);

  const handleEndInterview = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "end_interview" }));
  }, []);

  const handleLanguageChange = useCallback((lang: Language) => {
    setLanguage(lang);
    setCode(activeProblem ? generateStarterCode(lang, activeProblem.title) : "");
    setRunResult({ status: "idle" });
  }, [activeProblem]);

  const handleRun = async () => {
    setRunResult({ status: "running" });
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, problemId: activeProblem?.id, mode: "run" }),
      });
      const data = await res.json();
      setRunResult({ status: data.status, output: data.output });
    } catch {
      setRunResult({ status: "error", output: "Could not reach backend." });
    }
  };

  const handleSubmit = async () => {
    setRunResult({ status: "running" });
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, problemId: activeProblem?.id, mode: "submit" }),
      });
      const data = await res.json();
      setRunResult({ status: data.status, output: data.output });
    } catch {
      setRunResult({ status: "error", output: "Could not reach backend." });
    }
  };

  // Horizontal resize (description | editor)
  const { leftPct, containerRef: hContainer, onDividerMouseDown: onHDivider } = useHorizontalResize(42);
  // Vertical resize (editor | console)
  const { consolePx, containerRef: vContainer, onDividerMouseDown: onVDivider } = useVerticalResize(180);

  function formatElapsed(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-zinc-100 font-sans overflow-hidden select-none">
      {/* ── Feedback loading overlay ── */}
      {generatingFeedback && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1a1a1a]/90 backdrop-blur-sm">
          <span className="inline-block w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-zinc-300 text-sm font-medium">Generating your feedback…</p>
          <p className="text-zinc-500 text-xs mt-1">This usually takes 10–15 seconds</p>
        </div>
      )}
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 h-11 bg-[#1a1a1a] border-b border-zinc-800 shrink-0 z-10">
        <span className="text-orange-500 font-bold text-base tracking-tight">CodePrep</span>

        <div className="flex items-center gap-2">
          {/* Elapsed timer */}
          {activeProblem && (
            <span className="text-xs font-mono text-zinc-500 tabular-nums w-12 text-center">
              {formatElapsed(elapsed)}
            </span>
          )}
          <div className="w-px h-4 bg-zinc-700" />
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as Language)}
            className="bg-zinc-800 text-zinc-200 text-xs px-2.5 py-1.5 rounded border border-zinc-700 outline-none hover:border-zinc-500 cursor-pointer"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          <button
            onClick={() => { setCode(activeProblem ? generateStarterCode(language, activeProblem.title) : ""); setRunResult({ status: "idle" }); }}
            className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1.5 transition-colors"
          >
            Reset
          </button>
          <div className="w-px h-4 bg-zinc-700" />
          <button
            onClick={handleRun}
            disabled={runResult.status === "running"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            Run
          </button>
          <button
            onClick={handleSubmit}
            disabled={runResult.status === "running"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-green-600 hover:bg-green-500 disabled:opacity-50 transition-colors"
          >
            Submit
          </button>
        </div>
      </header>

      {/* ── Main split (horizontal) ── */}
      <div ref={hContainer} className="flex flex-1 overflow-hidden">

        {/* Left: Description */}
        <div style={{ width: `${leftPct}%` }} className="flex flex-col bg-[#1e1e1e] overflow-hidden min-w-[200px]">
          <DescriptionPanel problem={activeProblem} />
        </div>

        {/* Horizontal divider */}
        <div
          onMouseDown={onHDivider}
          className="w-1 bg-zinc-800 hover:bg-orange-500 cursor-col-resize transition-colors shrink-0 active:bg-orange-500"
        />

        {/* Right: Editor + Console (vertical split) */}
        <div ref={vContainer} className="flex-1 flex flex-col overflow-hidden min-w-[200px]">

          {/* Editor */}
          <div className="flex-1 overflow-hidden relative">
            {aiTyping && (
              <div className="absolute top-2 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-medium pointer-events-none select-none">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                AI typing…
              </div>
            )}
            <MonacoEditor
              height="100%"
              language={MONACO_LANG[language]}
              value={aiTyping ? undefined : code}
              onMount={handleEditorMount}
              onChange={(v) => {
                // Suppress state updates while AI is animating — we sync at the end
                if (aiTypingActiveRef.current) return;
                const newCode = v ?? "";
                setCode(newCode);
                codeRef.current = newCode;
                if (codeDebounceRef.current) clearTimeout(codeDebounceRef.current);
                codeDebounceRef.current = setTimeout(() => {
                  wsRef.current?.send(JSON.stringify({ type: "code", code: newCode }));
                }, 500);
              }}
              theme="vs-dark"
              options={{
                fontSize: 13,
                fontFamily: "'Geist Mono', 'Fira Code', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                renderLineHighlight: "line",
                padding: { top: 12, bottom: 12 },
                tabSize: 4,
                wordWrap: "on",
                folding: true,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>

          {/* Vertical divider */}
          <div
            onMouseDown={onVDivider}
            className="h-1 bg-zinc-800 hover:bg-orange-500 cursor-row-resize transition-colors shrink-0 active:bg-orange-500"
          />

          {/* Console */}
          <div style={{ height: `${consolePx}px` }} className="flex flex-col bg-[#1a1a1a] overflow-hidden min-h-[60px]">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 shrink-0">
              <span className="text-xs font-medium text-zinc-400">Console</span>
              {runResult.status !== "idle" && (
                <button
                  onClick={() => setRunResult({ status: "idle" })}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex-1 px-4 py-3 overflow-y-auto">
              {runResult.status === "idle" && (
                <p className="text-xs text-zinc-600">Run your code to see output here.</p>
              )}
              {runResult.status === "running" && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="inline-block w-3 h-3 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                  Running...
                </div>
              )}
              {(runResult.status === "accepted" || runResult.status === "wrong_answer" || runResult.status === "error") && (
                <pre className={`text-xs font-mono whitespace-pre-wrap leading-relaxed ${
                  runResult.status === "accepted" ? "text-emerald-400"
                  : runResult.status === "wrong_answer" ? "text-yellow-400"
                  : "text-red-400"
                }`}>
                  {runResult.output}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
      <VoiceAgent sessionId={String(sessionId)} onRequestEnd={handleEndInterview} />
    </div>
  );
}
