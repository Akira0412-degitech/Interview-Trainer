"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface AICamProps {
  stream: MediaStream | null;
  speaking: boolean;
}

const W = 256;
const H_SPEC = 56;
const BAR_COUNT = 40;

export default function AICam({ stream, speaking }: AICamProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const dragRef = useRef<{ active: boolean; ox: number; oy: number }>({
    active: false,
    ox: 0,
    oy: 0,
  });

  // Position: left side, just above the VideoPip in the bottom-right
  const [pos, setPos] = useState({ x: 24, y: 120 });

  // ── Audio analysis setup ──────────────────────────────────────────────────
  useEffect(() => {
    if (!stream) {
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      analyserRef.current = null;
      return;
    }

    // AudioContext just for analysis — does NOT route audio to speakers
    const AudioCtx = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    // Must resume — browsers start AudioContext suspended until after user gesture
    ctx.resume();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.82;
    ctx.createMediaStreamSource(stream).connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    return () => {
      ctx.close();
      audioCtxRef.current = null;
      analyserRef.current = null;
    };
  }, [stream]);

  // ── Canvas draw loop ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const gap = 2.5;
    const barW = (W - (BAR_COUNT - 1) * gap) / BAR_COUNT;

    let lastTime = 0;

    const tick = (time: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (time - lastTime < 16) return; // cap ~60 fps
      lastTime = time;

      ctx2d.clearRect(0, 0, W, H_SPEC);

      const analyser = analyserRef.current;
      let heights: number[] = [];
      // Always read real frequency data when analyser is ready — never gate on
      // the speaking prop, which lags behind actual audio by event-round-trip.
      // Derive "hasAudio" from actual energy so colors track true playback.
      let hasAudio = false;

      if (analyser) {
        if (audioCtxRef.current?.state === "suspended") {
          audioCtxRef.current.resume();
        }
        const freqData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freqData);
        const step = Math.floor(freqData.length / BAR_COUNT);
        let sum = 0;
        for (let i = 0; i < BAR_COUNT; i++) {
          const v = freqData[i * step] ?? 0;
          sum += v;
          heights.push(Math.max(2, (v / 255) * (H_SPEC - 4)));
        }
        hasAudio = sum / BAR_COUNT > 4; // energy threshold
      } else {
        // Gentle breathing idle animation
        const t = time / 1000;
        for (let i = 0; i < BAR_COUNT; i++) {
          const phase = (i / BAR_COUNT) * Math.PI * 2;
          heights.push(2 + 3 * Math.abs(Math.sin(t * 0.8 + phase)));
        }
      }

      for (let i = 0; i < BAR_COUNT; i++) {
        const bh = heights[i];
        const bx = i * (barW + gap);
        const by = H_SPEC - bh;

        const grad = ctx2d.createLinearGradient(bx, by, bx, H_SPEC);
        if (hasAudio) {
          grad.addColorStop(0, "rgba(56,189,248,0.95)");   // sky-400
          grad.addColorStop(0.45, "rgba(99,102,241,0.9)"); // indigo-500
          grad.addColorStop(1, "rgba(167,139,250,0.7)");   // violet-400
        } else {
          grad.addColorStop(0, "rgba(100,116,139,0.35)");
          grad.addColorStop(1, "rgba(71,85,105,0.15)");
        }

        ctx2d.fillStyle = grad;
        // Rounded-top bar via manual path
        const r = Math.min(barW / 2, 2);
        ctx2d.beginPath();
        ctx2d.moveTo(bx + r, by);
        ctx2d.lineTo(bx + barW - r, by);
        ctx2d.quadraticCurveTo(bx + barW, by, bx + barW, by + r);
        ctx2d.lineTo(bx + barW, H_SPEC);
        ctx2d.lineTo(bx, H_SPEC);
        ctx2d.lineTo(bx, by + r);
        ctx2d.quadraticCurveTo(bx, by, bx + r, by);
        ctx2d.closePath();
        ctx2d.fill();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stream]);

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

  if (!stream) return null;

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

      {/* ── Spectrogram ── */}
      <div className="bg-zinc-950 px-3 pt-2 pb-3">
        <canvas
          ref={canvasRef}
          width={W}
          height={H_SPEC}
          className="w-full"
          style={{ height: H_SPEC }}
        />
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
