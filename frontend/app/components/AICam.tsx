"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface AICamProps {
  stream: MediaStream | null;
  speaking: boolean;
  camOff?: boolean;
}

const W = 256;

export default function AICam({ stream, speaking, camOff }: AICamProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ active: boolean; ox: number; oy: number }>({
    active: false,
    ox: 0,
    oy: 0,
  });

  // Position: left side, just above the VideoPip in the bottom-right
  const [pos, setPos] = useState({ x: 24, y: 120 });

  // ── Drag ─────────────────────────────────────────────────────────────────
  const onDragDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragRef.current = { active: true, ox: e.clientX - rect.left, oy: e.clientY - rect.top };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - W - 8, e.clientX - dragRef.current.ox)),
        y: Math.max(0, Math.min(window.innerHeight - 220, e.clientY - dragRef.current.oy)),
      });
    };
    const onUp = () => { dragRef.current.active = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (!stream || camOff) return null;

  return (
    <div
      ref={panelRef}
      style={{ left: pos.x, top: pos.y, width: W }}
      className="fixed z-50 rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.6)] border border-white/[0.07] bg-zinc-900/95 backdrop-blur-xl"
    >
      {/* ── Title bar ── */}
      <div
        onMouseDown={onDragDown}
        className="flex items-center gap-2 px-3 py-2 bg-zinc-800/70 backdrop-blur-sm cursor-grab active:cursor-grabbing select-none border-b border-white/5"
      >
        <div
          className={`w-2 h-2 rounded-full shrink-0 transition-all duration-300 ${
            speaking
              ? "bg-sky-400 shadow-[0_0_8px_3px_rgba(56,189,248,0.55)]"
              : "bg-zinc-600"
          }`}
        />
        <span className="text-[11px] font-semibold text-zinc-300 tracking-wide">
          AI Interviewer
        </span>
        <div className="ml-auto">
          {speaking ? (
            <span className="text-[9px] font-bold text-sky-400 uppercase tracking-widest animate-pulse">
              Speaking
            </span>
          ) : (
            <span className="text-[9px] text-zinc-600 uppercase tracking-widest">
              Listening
            </span>
          )}
        </div>
      </div>

      {/* ── Avatar area ── */}
      <div className="relative flex items-center justify-center h-36 bg-linear-to-b from-zinc-900 to-zinc-950 overflow-hidden">
        {/* Background radial glow */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${
            speaking ? "opacity-100" : "opacity-20"
          }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_65%,rgba(56,189,248,0.10),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_50%_50%,rgba(99,102,241,0.08),transparent)]" />
        </div>

        {/* Orb */}
        <div className="relative flex items-center justify-center">
          {/* Pulse rings */}
          {speaking && (
            <>
              <span
                className="absolute w-24 h-24 rounded-full border border-sky-400/25 animate-ping"
                style={{ animationDuration: "1.4s" }}
              />
              <span
                className="absolute w-32 h-32 rounded-full border border-indigo-400/15 animate-ping"
                style={{ animationDuration: "2.1s" }}
              />
            </>
          )}

          {/* Static ring */}
          <div
            className={`absolute w-18 h-18 rounded-full border-2 transition-all duration-500 ${
              speaking
                ? "border-sky-400/50 shadow-[0_0_24px_rgba(56,189,248,0.35)]"
                : "border-zinc-700/50"
            }`}
          />

          {/* Core */}
          <div
            className={`relative w-15 h-15 rounded-full flex items-center justify-center transition-all duration-500 ${
              speaking
                ? "bg-linear-to-br from-sky-400 via-indigo-500 to-violet-500 shadow-[0_0_36px_rgba(99,102,241,0.55)]"
                : "bg-linear-to-br from-zinc-700 via-zinc-600 to-zinc-700"
            }`}
          >
            <BotIcon speaking={speaking} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BotIcon({ speaking }: { speaking: boolean }) {
  return (
    <svg
      className={`w-7 h-7 transition-colors duration-300 ${
        speaking ? "text-white" : "text-zinc-400"
      }`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
    >
      {/* Robot/AI face */}
      <rect x="3" y="8" width="18" height="11" rx="2" strokeLinecap="round" />
      <circle cx="8.5" cy="13" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="13" r="1.5" fill="currentColor" stroke="none" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17h6" />
      <path strokeLinecap="round" d="M12 4v4M9.5 4h5" />
    </svg>
  );
}
