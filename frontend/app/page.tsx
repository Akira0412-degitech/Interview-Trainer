"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type Difficulty = "Easy" | "Medium" | "Hard";
type TabId = "description" | "hints" | "submissions";
type Language = "python" | "javascript" | "typescript" | "java" | "cpp";

interface Problem {
  id: number;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  acceptance: string;
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
  hints: string[];
  starterCode: Record<Language, string>;
}

const problems: Problem[] = [
  {
    id: 1,
    title: "Two Sum",
    difficulty: "Easy",
    tags: ["Array", "Hash Table"],
    acceptance: "52.3%",
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
    hints: [
      "A brute force approach is O(n²). Can you do better?",
      "Think about using a hash map to store complements.",
      "For each number x, check if target - x exists in the map.",
    ],
    starterCode: {
      python: `def twoSum(nums: list[int], target: int) -> list[int]:\n    pass\n`,
      javascript: `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    \n};\n`,
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
    acceptance: "40.8%",
    description:
      "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
    examples: [
      { input: 's = "()"', output: "true" },
      { input: 's = "()[]{}"', output: "true" },
      { input: 's = "(]"', output: "false" },
    ],
    constraints: ["1 <= s.length <= 10⁴", "s consists of parentheses only '()[]{}'."],
    hints: [
      "Use a stack data structure.",
      "Push opening brackets onto the stack.",
      "When you see a closing bracket, check if it matches the top of the stack.",
    ],
    starterCode: {
      python: `def isValid(s: str) -> bool:\n    pass\n`,
      javascript: `/**\n * @param {string} s\n * @return {boolean}\n */\nvar isValid = function(s) {\n    \n};\n`,
      typescript: `function isValid(s: string): boolean {\n    \n};\n`,
      java: `class Solution {\n    public boolean isValid(String s) {\n        \n    }\n}\n`,
      cpp: `class Solution {\npublic:\n    bool isValid(string s) {\n        \n    }\n};\n`,
    },
  },
  {
    id: 3,
    title: "Merge Two Sorted Lists",
    difficulty: "Easy",
    tags: ["Linked List", "Recursion"],
    acceptance: "63.1%",
    description:
      "You are given the heads of two sorted linked lists `list1` and `list2`.\n\nMerge the two lists into one **sorted** list. The list should be made by splicing together the nodes of the first two lists.\n\nReturn the head of the merged linked list.",
    examples: [
      { input: "list1 = [1,2,4], list2 = [1,3,4]", output: "[1,1,2,3,4,4]" },
      { input: "list1 = [], list2 = []", output: "[]" },
      { input: "list1 = [], list2 = [0]", output: "[0]" },
    ],
    constraints: [
      "The number of nodes in both lists is in the range [0, 50].",
      "-100 <= Node.val <= 100",
      "Both list1 and list2 are sorted in non-decreasing order.",
    ],
    hints: [
      "Use a dummy head node to simplify edge cases.",
      "Compare the current nodes of both lists and advance the smaller one.",
      "A recursive approach is also elegant here.",
    ],
    starterCode: {
      python: `# Definition for singly-linked list.\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\ndef mergeTwoLists(list1, list2):\n    pass\n`,
      javascript: `var mergeTwoLists = function(list1, list2) {\n    \n};\n`,
      typescript: `function mergeTwoLists(list1: ListNode | null, list2: ListNode | null): ListNode | null {\n    \n};\n`,
      java: `class Solution {\n    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {\n        \n    }\n}\n`,
      cpp: `class Solution {\npublic:\n    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {\n        \n    }\n};\n`,
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

function DescriptionPanel({ problem, activeTab, setActiveTab }: {
  problem: Problem;
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
}) {
  const tabs: { id: TabId; label: string }[] = [
    { id: "description", label: "Description" },
    { id: "hints", label: "Hints" },
    { id: "submissions", label: "Submissions" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-700 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === t.id
                ? "text-white border-b-2 border-orange-500"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {activeTab === "description" && (
          <>
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

            {/* Description prose */}
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
          </>
        )}

        {activeTab === "hints" && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">Click to reveal hints one at a time.</p>
            {problem.hints.map((hint, i) => (
              <HintCard key={i} index={i} hint={hint} />
            ))}
          </div>
        )}

        {activeTab === "submissions" && (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-500 text-sm gap-2">
            <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            No submissions yet
          </div>
        )}
      </div>
    </div>
  );
}

function HintCard({ index, hint }: { index: number; hint: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <button
      onClick={() => setRevealed(true)}
      className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-all ${
        revealed
          ? "bg-zinc-800 border-zinc-600 text-zinc-300 cursor-default"
          : "bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-400"
      }`}
    >
      {revealed ? hint : `Hint ${index + 1} — click to reveal`}
    </button>
  );
}

export default function Home() {
  const [activeProblem, setActiveProblem] = useState<Problem>(problems[0]);
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState<string>(problems[0].starterCode["python"]);
  const [activeTab, setActiveTab] = useState<TabId>("description");
  const [runResult, setRunResult] = useState<{ status: "idle" | "running" | "accepted" | "wrong_answer" | "error"; output?: string }>({ status: "idle" });
  const [showProblems, setShowProblems] = useState(false);

  const handleLanguageChange = useCallback((lang: Language) => {
    setLanguage(lang);
    setCode(activeProblem.starterCode[lang]);
    setRunResult({ status: "idle" });
  }, [activeProblem]);

  const handleProblemSelect = useCallback((p: Problem) => {
    setActiveProblem(p);
    setCode(p.starterCode[language]);
    setActiveTab("description");
    setRunResult({ status: "idle" });
    setShowProblems(false);
  }, [language]);

  const handleRun = async () => {
    setRunResult({ status: "running" });
    try {
      const res = await fetch("http://localhost:8080/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          problemId: activeProblem.id,
          mode: "run",
        }),
      });
      const data = await res.json();
      setRunResult({ status: data.status, output: data.output });
    } catch {
      setRunResult({ status: "error", output: "Could not reach backend. Is the server running on port 8080?" });
    }
  };

  const handleSubmit = async () => {
    setRunResult({ status: "running" });
    try {
      const res = await fetch("http://localhost:8080/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          problemId: activeProblem.id,
          mode: "submit",
        }),
      });
      const data = await res.json();
      setRunResult({ status: data.status, output: data.output });
    } catch {
      setRunResult({ status: "error", output: "Could not reach backend. Is the server running on port 8080?" });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-zinc-100 font-sans overflow-hidden">
      {/* ── Top Nav ── */}
      <header className="flex items-center justify-between px-4 h-11 bg-[#1a1a1a] border-b border-zinc-800 shrink-0 z-10">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <span className="text-orange-500 font-bold text-base tracking-tight">CodePrep</span>
          <span className="text-zinc-700 text-xs">|</span>
          {/* Problem list toggle */}
          <button
            onClick={() => setShowProblems((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Problem List
            <svg className={`w-3.5 h-3.5 transition-transform ${showProblems ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
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

      {/* ── Problem List Dropdown ── */}
      {showProblems && (
        <div className="absolute top-11 left-0 right-0 z-20 bg-[#1e1e1e] border-b border-zinc-700 shadow-2xl max-h-72 overflow-y-auto">
          {problems.map((p) => (
            <button
              key={p.id}
              onClick={() => handleProblemSelect(p)}
              className={`w-full flex items-center gap-4 px-5 py-3 text-sm hover:bg-zinc-800 transition-colors text-left ${activeProblem.id === p.id ? "bg-zinc-800" : ""}`}
            >
              <span className="text-zinc-500 w-6 text-right shrink-0">{p.id}.</span>
              <span className="flex-1 text-zinc-200">{p.title}</span>
              <span className={`text-xs font-medium shrink-0 ${difficultyColor[p.difficulty]}`}>{p.difficulty}</span>
              <span className="text-xs text-zinc-500 shrink-0">{p.acceptance}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Main split ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Description */}
        <div className="w-[45%] min-w-[320px] flex flex-col border-r border-zinc-800 bg-[#1e1e1e] overflow-hidden">
          <DescriptionPanel problem={activeProblem} activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Right: Editor + Console */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-zinc-800 shrink-0">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as Language)}
              className="bg-zinc-800 text-zinc-200 text-xs px-2.5 py-1.5 rounded border border-zinc-700 outline-none hover:border-zinc-500 focus:border-zinc-400 cursor-pointer"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <button
              onClick={() => setCode(activeProblem.starterCode[language])}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <MonacoEditor
              height="100%"
              language={MONACO_LANG[language]}
              value={code}
              onChange={(v) => setCode(v ?? "")}
              theme="vs-dark"
              options={{
                fontSize: 13,
                fontFamily: "'Geist Mono', 'Fira Code', 'Cascadia Code', monospace",
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

          {/* Console / Output */}
          <div className="border-t border-zinc-800 bg-[#1a1a1a] shrink-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
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
            <div className="px-4 py-3 min-h-[80px] max-h-40 overflow-y-auto">
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
