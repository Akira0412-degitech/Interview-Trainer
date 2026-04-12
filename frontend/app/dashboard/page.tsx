"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Difficulty = "easy" | "medium" | "hard";
type Personality = "friendly" | "strict" | "neutral";

interface PastSession {
  id: number;
  personality: Personality;
  startedAt: string;
  endedAt: string | null;
  score: number | null;
  problem: {
    title: string;
    difficulty: Difficulty;
  };
}

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

const personalityLabel: Record<Personality, string> = {
  friendly: "Alex (Friendly)",
  neutral: "Jordan (Neutral)",
  strict: "Morgan (Strict)",
};

const personalityColor: Record<Personality, string> = {
  friendly: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  neutral: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  strict: "text-red-400 bg-red-400/10 border-red-400/20",
};

function getScoreColor(score: number) {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(start: string, end: string | null) {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Stats summary
// ---------------------------------------------------------------------------
function SummaryStats({ sessions }: { sessions: PastSession[] }) {
  const completed = sessions.filter((s) => s.endedAt && s.score !== null);
  const avgScore =
    completed.length > 0
      ? Math.round(completed.reduce((acc, s) => acc + (s.score ?? 0), 0) / completed.length)
      : null;
  const best =
    completed.length > 0
      ? Math.max(...completed.map((s) => s.score ?? 0))
      : null;

  const stats = [
    {
      label: "Total Sessions",
      value: sessions.length.toString(),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: "Completed",
      value: completed.length.toString(),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Avg Score",
      value: avgScore !== null ? `${avgScore}` : "—",
      valueClass: avgScore !== null ? getScoreColor(avgScore) : "text-zinc-400",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
    {
      label: "Best Score",
      value: best !== null ? `${best}` : "—",
      valueClass: best !== null ? getScoreColor(best) : "text-zinc-400",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-[#1e1e1e] rounded-xl border border-zinc-800 px-5 py-4 flex flex-col gap-2"
        >
          <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
            {s.icon}
            {s.label}
          </div>
          <span className={`text-2xl font-bold ${s.valueClass ?? "text-zinc-100"}`}>
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session card
// ---------------------------------------------------------------------------
function SessionCard({ session, onDelete }: { session: PastSession; onDelete: (id: number) => void }) {
  const isCompleted = session.endedAt !== null && session.score !== null;
  const isPending = session.endedAt !== null && session.score === null;
  const isInProgress = session.endedAt === null;

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onDelete(session.id);
  }

  const href = isCompleted
    ? `/feedback/${session.id}`
    : isInProgress
    ? `/interview/${session.id}`
    : "#";

  return (
    <Link
      href={href}
      className={`group block bg-[#1e1e1e] border border-zinc-800 rounded-xl p-5 transition-all ${
        isCompleted || isInProgress
          ? "hover:border-zinc-600 hover:shadow-lg hover:shadow-black/20 cursor-pointer"
          : "opacity-70 cursor-default"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                difficultyBg[session.problem.difficulty]
              } ${difficultyColor[session.problem.difficulty]}`}
            >
              {capitalize(session.problem.difficulty)}
            </span>
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                personalityColor[session.personality]
              }`}
            >
              {personalityLabel[session.personality]}
            </span>
          </div>

          <h3 className="text-sm font-semibold text-zinc-100 truncate group-hover:text-white transition-colors">
            {session.problem.title}
          </h3>

          <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(session.startedAt)}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDuration(session.startedAt, session.endedAt)}
            </span>
          </div>
        </div>

        {/* Right — score + delete */}
        <div className="shrink-0 flex flex-col items-center gap-2">
          {isCompleted ? (
            <>
              <span className={`text-2xl font-bold ${getScoreColor(session.score!)}`}>
                {session.score}
              </span>
              <span className="text-[10px] text-zinc-500">/ 100</span>
            </>
          ) : isPending ? (
            <span className="text-xs text-zinc-500 italic">Processing…</span>
          ) : (
            <span className="text-xs text-emerald-400 font-medium">In Progress</span>
          )}
          <button
            onClick={handleDelete}
            title="Delete session"
            className="mt-1 p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {isCompleted && (
        <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-end">
          <span className="text-[11px] text-zinc-500 group-hover:text-zinc-400 flex items-center gap-1 transition-colors">
            View feedback
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      )}
      {isInProgress && (
        <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-end">
          <span className="text-[11px] text-emerald-400 group-hover:text-emerald-300 flex items-center gap-1 transition-colors">
            Continue interview
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const [sessions, setSessions] = useState<PastSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Difficulty>("all");

  async function handleDelete(id: number) {
    if (!confirm("Delete this session? This cannot be undone.")) return;
    setSessions((prev) => prev.filter((s) => s.id !== id));
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      // Re-fetch to restore state on failure
      fetch("/api/users/me/sessions")
        .then((r) => r.json())
        .then(setSessions)
        .catch(() => {});
    }
  }

  useEffect(() => {
    fetch("/api/users/me/sessions")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load sessions");
        return res.json();
      })
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load your sessions. Please try again.");
        setLoading(false);
      });
  }, []);

  const filtered =
    filter === "all" ? sessions : sessions.filter((s) => s.problem.difficulty === filter);

  return (
    <div className="flex flex-col min-h-screen bg-[#1a1a1a] text-zinc-100 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 h-12 bg-[#1a1a1a] border-b border-zinc-800 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-orange-500 font-bold text-base tracking-tight">CodePrep</span>
          <span className="text-zinc-700 text-xs">|</span>
          <span className="text-xs text-zinc-400">Dashboard</span>
        </div>
        <Link
          href="/session"
          className="flex items-center gap-1.5 text-xs font-medium bg-orange-500 hover:bg-orange-400 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Interview
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
          {/* Page title */}
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Past Interviews</h1>
            <p className="text-sm text-zinc-500 mt-1">Review your performance and track your progress over time.</p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <span className="inline-block w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-zinc-400 text-sm">Loading your sessions…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-zinc-300 font-medium">No interviews yet</p>
                <p className="text-zinc-500 text-sm mt-1">Complete your first interview to see your results here.</p>
              </div>
              <Link
                href="/session"
                className="mt-2 text-sm font-medium bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Start an Interview
              </Link>
            </div>
          ) : (
            <>
              <SummaryStats sessions={sessions} />

              {/* Filters */}
              <div className="flex items-center gap-2">
                {(["all", "easy", "medium", "hard"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      filter === f
                        ? "bg-orange-500/20 border-orange-500/40 text-orange-400 font-medium"
                        : "bg-transparent border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
                    }`}
                  >
                    {f === "all" ? "All" : capitalize(f)}
                  </button>
                ))}
                <span className="ml-auto text-xs text-zinc-500">
                  {filtered.length} session{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Session list */}
              {filtered.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-12">No {filter} sessions yet.</p>
              ) : (
                <div className="space-y-3">
                  {filtered.map((s) => (
                    <SessionCard key={s.id} session={s} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
