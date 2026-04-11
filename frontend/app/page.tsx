"use client";

import { useState } from "react";

const sampleQuestion = {
  id: 1,
  title: "Tell me about yourself",
  category: "Behavioral",
  difficulty: "Easy",
  description:
    "Introduce yourself briefly. Focus on your background, skills, and why you're interested in this role.",
  hints: [
    "Keep it under 2 minutes",
    "Mention your most relevant experience",
    "End with why you want this role",
  ],
};

export default function Home() {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (answer.trim()) {
      setSubmitted(true);
    }
  };

  const handleReset = () => {
    setAnswer("");
    setSubmitted(false);
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-900 text-zinc-100 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-zinc-800 border-b border-zinc-700">
        <span className="text-lg font-bold text-white">Interview Trainer</span>
        <div className="flex gap-3 text-sm">
          <button className="px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600">Problems</button>
          <button className="px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600">Progress</button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Question */}
        <div className="w-1/2 flex flex-col border-r border-zinc-700 overflow-y-auto p-6 gap-4">
          {/* Question Meta */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-400">#{sampleQuestion.id}</span>
            <span className="font-semibold text-white">{sampleQuestion.title}</span>
            <span className="ml-auto px-2 py-0.5 rounded-full bg-green-800 text-green-300 text-xs">
              {sampleQuestion.difficulty}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-800 text-blue-300 text-xs">
              {sampleQuestion.category}
            </span>
          </div>

          <hr className="border-zinc-700" />

          {/* Description */}
          <p className="text-zinc-300 leading-7">{sampleQuestion.description}</p>

          {/* Hints */}
          <div className="mt-4">
            <p className="text-sm font-semibold text-zinc-400 mb-2">Hints</p>
            <ul className="list-disc list-inside text-zinc-400 text-sm space-y-1">
              {sampleQuestion.hints.map((hint, i) => (
                <li key={i}>{hint}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Panel: Answer */}
        <div className="w-1/2 flex flex-col p-6 gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Your Answer</span>
            <span className="text-xs text-zinc-500">{answer.length} characters</span>
          </div>

          <textarea
            className="flex-1 bg-zinc-800 rounded-lg p-4 text-zinc-100 text-sm resize-none outline-none border border-zinc-700 focus:border-zinc-500"
            placeholder="Type your answer here..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={submitted}
          />

          {/* Feedback Area */}
          {submitted && (
            <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-4 text-sm text-zinc-300">
              <p className="font-semibold text-green-400 mb-1">Submitted!</p>
              <p>AI feedback will appear here once the backend is connected.</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm"
            >
              Reset
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitted || !answer.trim()}
              className="px-6 py-2 rounded bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold ml-auto"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
