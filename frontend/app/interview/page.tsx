"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type Difficulty = "Easy" | "Medium" | "Hard";
type Language = "python" | "javascript" | "typescript" | "java" | "cpp";

interface Problem {
  id: number;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
  starterCode: Record<Language, string>;
}

const problems: Problem[] = [
  {
    id: 1,
    title: "Two Sum",
    difficulty: "Easy",
    tags: ["Array", "Hash Table"],
    description:
      "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have **exactly one solution**, and you may not use the same element twice.\n\nYou can return the answer in any order.",
    examples: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
      { input: "nums = [3,3], target = 6", output: "[0,1]" },
    ],
    constraints: [
      "2 <= nums.length <= 10⁴",
      "-10⁹ <= nums[i] <= 10⁹",
      "-10⁹ <= target <= 10⁹",
      "Only one valid answer exists.",
    ],
    starterCode: {
      python: `def twoSum(nums: list[int], target: int) -> list[int]:\n    pass\n`,
      javascript: `var twoSum = function(nums, target) {\n    \n};\n`,
      typescript: `function twoSum(nums: number[], target: number): number[] {\n    \n};\n`,
      java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}\n`,
      cpp: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};\n`,
    },
  },
  {
    id: 2,
    title: "Valid Parentheses",
    difficulty: "Easy",
    tags: ["String", "Stack"],
    description:
      "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
    examples: [
      { input: 's = "()"', output: "true" },
      { input: 's = "()[]{}"', output: "true" },
      { input: 's = "(]"', output: "false" },
    ],
    constraints: ["1 <= s.length <= 10⁴", "s consists of parentheses only '()[]{}'."],
    starterCode: {
      python: `def isValid(s: str) -> bool:\n    pass\n`,
      javascript: `var isValid = function(s) {\n    \n};\n`,
      typescript: `function isValid(s: string): boolean {\n    \n};\n`,
      java: `class Solution {\n    public boolean isValid(String s) {\n        \n    }\n}\n`,
      cpp: `class Solution {\npublic:\n    bool isValid(string s) {\n        \n    }\n};\n`,
    },
  },
];

const difficultyColor: Record<Difficulty, string> = {
  Easy: "text-emerald-400",
  Medium: "text-yellow-400",
  Hard: "text-red-400",
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
function DescriptionPanel({ problem }: { problem: Problem }) {
  return (
    <div className="flex flex-col h-full overflow-y-auto p-5 space-y-5">
      {/* Title + difficulty */}
      <div>
        <h1 className="text-xl font-semibold text-white mb-1">
          {problem.id}. {problem.title}
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-sm font-medium ${difficultyColor[problem.difficulty]}`}>
            {problem.difficulty}
          </span>
          {problem.tags.map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">
              {tag}
            </span>
          ))}
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

      {/* Examples */}
      <div className="space-y-3">
        {problem.examples.map((ex, i) => (
          <div key={i} className="rounded-lg bg-zinc-800 p-4 text-sm space-y-1">
            <p className="text-zinc-400 font-medium text-xs uppercase tracking-wide mb-2">Example {i + 1}</p>
            <div className="font-mono text-xs space-y-1">
              <p><span className="text-zinc-400">Input: </span><span className="text-zinc-200">{ex.input}</span></p>
              <p><span className="text-zinc-400">Output: </span><span className="text-zinc-200">{ex.output}</span></p>
              {ex.explanation && (
                <p><span className="text-zinc-400">Explanation: </span><span className="text-zinc-300">{ex.explanation}</span></p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Constraints */}
      <div>
        <p className="text-sm font-semibold text-zinc-300 mb-2">Constraints</p>
        <ul className="space-y-1">
          {problem.constraints.map((c, i) => (
            <li key={i} className="text-xs text-zinc-400 font-mono flex items-start gap-2">
              <span className="text-zinc-600 mt-0.5">•</span> {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [activeProblem] = useState<Problem>(problems[0]);
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState<string>(problems[0].starterCode["python"]);
  const [runResult, setRunResult] = useState<{
    status: "idle" | "running" | "accepted" | "wrong_answer" | "error";
    output?: string;
  }>({ status: "idle" });

  const handleLanguageChange = useCallback((lang: Language) => {
    setLanguage(lang);
    setCode(activeProblem.starterCode[lang]);
    setRunResult({ status: "idle" });
  }, [activeProblem]);

  const handleRun = async () => {
    setRunResult({ status: "running" });
    try {
      const res = await fetch("http://localhost:8080/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, problemId: activeProblem.id, mode: "run" }),
      });
      const data = await res.json();
      setRunResult({ status: data.status, output: data.output });
    } catch {
      setRunResult({ status: "error", output: "Could not reach backend on port 8080." });
    }
  };

  const handleSubmit = async () => {
    setRunResult({ status: "running" });
    try {
      const res = await fetch("http://localhost:8080/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, problemId: activeProblem.id, mode: "submit" }),
      });
      const data = await res.json();
      setRunResult({ status: data.status, output: data.output });
    } catch {
      setRunResult({ status: "error", output: "Could not reach backend on port 8080." });
    }
  };

  // Horizontal resize (description | editor)
  const { leftPct, containerRef: hContainer, onDividerMouseDown: onHDivider } = useHorizontalResize(42);
  // Vertical resize (editor | console)
  const { consolePx, containerRef: vContainer, onDividerMouseDown: onVDivider } = useVerticalResize(180);

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-zinc-100 font-sans overflow-hidden select-none">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 h-11 bg-[#1a1a1a] border-b border-zinc-800 shrink-0 z-10">
        <span className="text-orange-500 font-bold text-base tracking-tight">CodePrep</span>

        <div className="flex items-center gap-2">
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
            onClick={() => { setCode(activeProblem.starterCode[language]); setRunResult({ status: "idle" }); }}
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
          <div className="flex-1 overflow-hidden">
            <MonacoEditor
              height="100%"
              language={MONACO_LANG[language]}
              value={code}
              onChange={(v) => setCode(v ?? "")}
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
    </div>
  );
}
