"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ScoreRing from "@/components/feedback/ScoreRing";
import PerformanceChart, {
  SubScore,
} from "@/components/feedback/PerformanceChart";
import TranscriptViewer, {
  TranscriptMessage,
} from "@/components/feedback/TranscriptViewer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Difficulty = "easy" | "medium" | "hard";

interface SessionData {
  id: number;
  personality: string;
  startedAt: string;
  endedAt: string | null;
  score: number | null;
  feedback: string | null;
  subScores: SubScore[] | null;
  transcript: TranscriptMessage[];
  problem: {
    title: string;
    difficulty: Difficulty;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const difficultyColor: Record<Difficulty, string> = {
  easy: "text-emerald-400",
  medium: "text-yellow-400",
  hard: "text-red-400",
};

const difficultyBg: Record<Difficulty, string> = {
  easy: "bg-emerald-400/10 border-emerald-400/20",
  medium: "bg-yellow-400/10 border-yellow-400/20",
  hard: "bg-red-400/10 border-red-400/20",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  icon,
  valueClass,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex-1 bg-[#1e1e1e] rounded-xl border border-zinc-800 px-5 py-4 flex flex-col gap-2 min-w-[130px]">
      <div className="flex items-center gap-2 text-zinc-500 text-xs">
        {icon}
        {label}
      </div>
      <span className={`text-base font-semibold text-zinc-100 ${valueClass ?? ""}`}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function FeedbackPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) { if (!cancelled) setError("Session not found."); return; }
        const data = await res.json();
        if (cancelled) return;
        // If feedback hasn't been generated yet, poll again in 3s
        if (!data.feedback) {
          setTimeout(poll, 3000);
        } else {
          setSession(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setError("Failed to load session.");
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  if (loading && !error) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center gap-3">
        <span className="inline-block w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400 text-sm">Loading your feedback…</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center gap-3">
        <p className="text-red-400 text-sm">{error ?? "Session not found."}</p>
        <Link href="/" className="text-xs text-zinc-400 hover:text-white underline">Back to home</Link>
      </div>
    );
  }

  const { problem, score, feedback, subScores, transcript } = session;

  return (
    <div className="flex flex-col min-h-screen bg-[#1a1a1a] text-zinc-100 font-sans">
      {/* ── Nav ── */}
      <header className="flex items-center justify-between px-4 h-11 bg-[#1a1a1a] border-b border-zinc-800 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-orange-500 font-bold text-base tracking-tight">
            CodePrep
          </span>
          <span className="text-zinc-700 text-xs">|</span>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Problems
          </Link>
        </div>

        <span className="text-xs text-zinc-500">
          Session #{session.id} &mdash; {formatDate(session.startedAt)}
        </span>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
          {/* ── Page header ── */}
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Interview complete
            </div>
            <h1 className="text-2xl font-semibold text-white">
              Session Feedback
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Here&apos;s a breakdown of your performance.
            </p>
          </div>

          {/* ── Hero: score ring + stat cards ── */}
          <div className="bg-[#1e1e1e] rounded-xl border border-zinc-800 p-6 flex flex-wrap gap-6 items-center">
            {/* Score ring */}
            <div className="shrink-0">
              <ScoreRing score={score ?? 0} size={152} />
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px self-stretch bg-zinc-800" />

            {/* Stat cards */}
            <div className="flex flex-wrap gap-3 flex-1 min-w-0">
              <StatCard
                label="Problem"
                value={problem.title}
                valueClass=""
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                }
              />
              <StatCard
                label="Difficulty"
                value={capitalize(problem.difficulty)}
                valueClass={difficultyColor[problem.difficulty]}
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                }
              />
              <StatCard
                label="Duration"
                value={formatDuration(session.startedAt, session.endedAt)}
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatCard
                label="Interviewer"
                value={capitalize(session.personality)}
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* ── Two-column: Feedback + Performance breakdown ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            {/* AI Feedback */}
            <div className="bg-[#1e1e1e] rounded-xl border border-zinc-800 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                <h2 className="text-sm font-semibold text-zinc-200">
                  AI Feedback
                </h2>
              </div>
              <div className="space-y-3">
                {(feedback ?? "").split("\n\n").map((para, i) => (
                  <p key={i} className="text-sm text-zinc-300 leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            </div>

            {/* Performance breakdown */}
            <div className="bg-[#1e1e1e] rounded-xl border border-zinc-800 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                <h2 className="text-sm font-semibold text-zinc-200">
                  Performance Breakdown
                </h2>
              </div>
              <PerformanceChart scores={subScores ?? []} />

              {/* Legend */}
              <div className="flex items-center gap-4 pt-2 border-t border-zinc-800">
                {[
                  { color: "bg-emerald-400", label: "Strong (≥75)" },
                  { color: "bg-yellow-400", label: "Fair (50–74)" },
                  { color: "bg-red-400", label: "Weak (<50)" },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-xs text-zinc-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Difficulty badge row ── */}
          <div
            className={`flex items-center gap-3 rounded-xl border px-5 py-4 ${
              difficultyBg[problem.difficulty]
            }`}
          >
            <svg
              className={`w-5 h-5 ${difficultyColor[problem.difficulty]}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>
            <p className="text-sm text-zinc-300">
              You attempted a{" "}
              <span className={`font-semibold ${difficultyColor[problem.difficulty]}`}>
                {capitalize(problem.difficulty)}
              </span>{" "}
              difficulty problem. Your score of{" "}
              <span className="font-semibold text-white">{score ?? "—"}/100</span>{" "}
              reflects a strong result at this level. Try a{" "}
              <span className="font-semibold text-white">
                {problem.difficulty === "easy"
                  ? "Medium"
                  : problem.difficulty === "medium"
                  ? "Hard"
                  : "new Hard"}
              </span>{" "}
              problem to keep improving.
            </p>
          </div>

          {/* ── Transcript ── */}
          <TranscriptViewer messages={transcript} />

          {/* ── Actions ── */}
          <div className="flex flex-wrap gap-3 pb-4">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 transition-colors text-sm font-medium text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Start new interview
            </Link>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm font-medium text-zinc-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export report
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
