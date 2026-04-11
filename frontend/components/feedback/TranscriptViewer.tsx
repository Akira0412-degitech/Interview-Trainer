"use client";

import { useState } from "react";

export interface TranscriptMessage {
  role: "ai" | "user";
  content: string;
  timestamp: string;
}

interface TranscriptViewerProps {
  messages: TranscriptMessage[];
}

export default function TranscriptViewer({ messages }: TranscriptViewerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[#1e1e1e] rounded-xl border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-800/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            className="w-4 h-4 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
            />
          </svg>
          <span className="text-sm font-medium text-zinc-200">
            Interview Transcript
          </span>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
            {messages.length} messages
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800 px-6 py-5 space-y-4 max-h-[500px] overflow-y-auto">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${
                msg.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 ${
                  msg.role === "ai"
                    ? "bg-orange-500 text-white"
                    : "bg-zinc-700 text-zinc-300"
                }`}
              >
                {msg.role === "ai" ? "AI" : "Me"}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[75%] space-y-1 ${
                  msg.role === "user" ? "items-end flex flex-col" : ""
                }`}
              >
                <div
                  className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "ai"
                      ? "bg-zinc-800 text-zinc-200 rounded-tl-none"
                      : "bg-zinc-700 text-zinc-100 rounded-tr-none"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-xs text-zinc-600 px-1">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
