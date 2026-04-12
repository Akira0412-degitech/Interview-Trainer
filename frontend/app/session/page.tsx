"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Difficulty = "easy" | "medium" | "hard";
type Personality = "strict" | "friendly" | "neutral";
interface Interviewer {
  id: Personality;
  name: string;
  role: string;
  description: string;
  traits: string[];
  badge: string;
  badgeColor: string;
  cardBorder: string;
  cardGlow: string;
  avatarBg: string;
  avatarText: string;
}

const INTERVIEWERS: Interviewer[] = [
  {
    id: "friendly",
    name: "Alex",
    role: "Junior Engineer",
    description: "Friendly and encouraging. Happy to give hints and guide you through the problem step by step.",
    traits: ["Gives hints freely", "Patient & supportive", "Positive feedback"],
    badge: "Easy",
    badgeColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    cardBorder: "border-emerald-500/30",
    cardGlow: "hover:shadow-emerald-500/10",
    avatarBg: "bg-emerald-500/10",
    avatarText: "text-emerald-400",
  },
  {
    id: "neutral",
    name: "Jordan",
    role: "Senior Engineer",
    description: "Balanced and professional. Standard interview pace with occasional nudges when you're stuck.",
    traits: ["Occasional hints", "Asks follow-ups", "Realistic pace"],
    badge: "Medium",
    badgeColor: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    cardBorder: "border-yellow-500/30",
    cardGlow: "hover:shadow-yellow-500/10",
    avatarBg: "bg-yellow-500/10",
    avatarText: "text-yellow-400",
  },
  {
    id: "strict",
    name: "Morgan",
    role: "Staff Engineer",
    description: "Strict and demanding. No hints. Expects optimal solutions and challenges every decision you make.",
    traits: ["No hints", "Pushes for optimal", "Time pressure"],
    badge: "Hard",
    badgeColor: "text-red-400 bg-red-400/10 border-red-400/30",
    cardBorder: "border-red-500/30",
    cardGlow: "hover:shadow-red-500/10",
    avatarBg: "bg-red-500/10",
    avatarText: "text-red-400",
  },
];

export default function SessionPage() {
  const router = useRouter();
  const [personality, setPersonality] = useState<Personality | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);

  const handleStart = async () => {
    if (!personality || !difficulty) return;
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personality, difficulty }),
    });

    if(!response.ok) {
      alert("Failed to create session. Please try again.");
      return;
    }
    const { sessionId } = await response.json();

    router.push(`/interview/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-zinc-100 flex flex-col items-center justify-center px-6 py-12 font-sans">

      {/* Header */}
      <div className="text-center mb-12">
        <span className="text-orange-500 font-bold text-lg tracking-tight">CodePrep</span>
        <h1 className="mt-3 text-3xl font-bold text-white tracking-tight">Choose your Interviewer</h1>
        <p className="mt-2 text-zinc-400 text-sm">Select a personality that matches your practice goal</p>
      </div>

      {/* Interviewer cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl">
        {INTERVIEWERS.map((iv) => (
          <button
            key={iv.id}
            onClick={() => {
              setPersonality(iv.id)
              setDifficulty(iv.badge.toLowerCase() as Difficulty)
            }}
            className={`relative flex flex-col items-center text-center rounded-2xl border bg-[#1e1e1e] p-6 gap-4 transition-all duration-200 shadow-lg cursor-pointer outline-none
              ${personality === iv.id
                ? `${iv.cardBorder} shadow-xl ${iv.cardGlow} scale-[1.03]`
                : "border-zinc-700/50 hover:border-zinc-600 hover:scale-[1.01]"
              }`}
          >
            {/* Selected indicator */}
            {personality === iv.id && (
              <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
            )}

            {/* Avatar placeholder */}
            <div className={`w-20 h-20 rounded-full ${iv.avatarBg} border ${iv.cardBorder} flex items-center justify-center`}>
              {/* Character image goes here */}
              <span className={`text-3xl font-bold ${iv.avatarText}`}>
                {iv.name[0]}
              </span>
            </div>

            {/* Name & role */}
            <div>
              <p className="text-white font-semibold text-base">{iv.name}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{iv.role}</p>
            </div>

            {/* Badge */}
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${iv.badgeColor}`}>
              {iv.badge}
            </span>

            {/* Description */}
            <p className="text-zinc-400 text-xs leading-relaxed">{iv.description}</p>

            {/* Traits */}
            <ul className="flex flex-col gap-1.5 w-full mt-1">
              {iv.traits.map((trait) => (
                <li key={trait} className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    iv.id === "friendly" ? "bg-emerald-500" :
                    iv.id === "neutral" ? "bg-yellow-500" : "bg-red-500"
                  }`} />
                  {trait}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {/* Start button */}
      <div className="mt-10 flex flex-col items-center gap-3">
        <button
          onClick={handleStart}
          disabled={!personality || !difficulty}
          className="px-10 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all duration-200 shadow-lg hover:shadow-orange-500/20 disabled:shadow-none"
        >
          Start Interview
        </button>
        {(!personality || !difficulty) && (
          <p className="text-zinc-600 text-xs">Select an interviewer to continue</p>
        )}
      </div>
    </div>
  );
}
