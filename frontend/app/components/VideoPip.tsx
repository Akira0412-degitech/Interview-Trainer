"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface VideoPipHandle {
  stream: MediaStream | null;
  audioTrack: MediaStreamTrack | null;
}

interface Props {
  onStreamReady?: (handle: VideoPipHandle) => void; // Phase 3 hook
  onStreamStop?: () => void;
}

const MIN_W = 200;
const MIN_H = 140;
const DEFAULT_W = 320;
const DEFAULT_H = 224;

type InteractType = "move" | "resize" | null;

export default function VideoPip({ onStreamReady, onStreamStop }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pipRef = useRef<HTMLDivElement>(null);

  // Position from bottom-right corner of viewport
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const [visible, setVisible] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Interaction state stored in ref to avoid stale closures
  const interact = useRef<{
    type: InteractType;
    startMouseX: number;
    startMouseY: number;
    startPos: { x: number; y: number };
    startSize: { w: number; h: number };
    // offset from mouse to element's right/bottom edge (for move)
    offsetFromRight: number;
    offsetFromBottom: number;
  }>({
    type: null,
    startMouseX: 0, startMouseY: 0,
    startPos: { x: 24, y: 24 },
    startSize: { w: DEFAULT_W, h: DEFAULT_H },
    offsetFromRight: 0, offsetFromBottom: 0,
  });

  // ── Camera ──────────────────────────────────────────────────────────────────
  const startStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setVisible(true);
      setError(null);
      onStreamReady?.({ stream, audioTrack: stream.getAudioTracks()[0] ?? null });
    } catch {
      setError("Camera/microphone permission required.");
    }
  }, [onStreamReady]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setVisible(false);
    onStreamStop?.();
  }, [onStreamStop]);

  // Attach stream after video element mounts in DOM
  useEffect(() => {
    if (visible && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.muted = true; // must set via ref — React muted prop doesn't apply to DOM
      videoRef.current.play().catch(() => {});
    }
  }, [visible]);

  // ── Mute / cam toggle ───────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = muted; });
    setMuted((v) => !v);
  }, [muted]);

  const toggleCam = useCallback(() => {
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = camOff; });
    setCamOff((v) => !v);
  }, [camOff]);

  // ── Drag (title bar) ────────────────────────────────────────────────────────
  const onMoveMouseDown = useCallback((e: React.MouseEvent) => {
    if (!pipRef.current) return;
    e.preventDefault();
    const rect = pipRef.current.getBoundingClientRect();
    // Store fixed offset between mouse and element's right/bottom edges
    interact.current = {
      ...interact.current,
      type: "move",
      offsetFromRight: rect.right - e.clientX,
      offsetFromBottom: rect.bottom - e.clientY,
    };
  }, []);


  // ── Global mouse move / up ───────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const { type } = interact.current;
      if (!type) return;

      if (type === "move") {
        const { offsetFromRight, offsetFromBottom } = interact.current;
        // New element position: keep same offset between mouse and edges
        const newRightEdge = e.clientX + offsetFromRight;
        const newBottomEdge = e.clientY + offsetFromBottom;
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - MIN_W, window.innerWidth - newRightEdge)),
          y: Math.max(0, Math.min(window.innerHeight - MIN_H, window.innerHeight - newBottomEdge)),
        });
      }

      if (type === "resize") {
        const { startMouseX, startMouseY, startSize } = interact.current;
        const dx = e.clientX - startMouseX;
        const dy = e.clientY - startMouseY;
        // Dragging left-bottom handle: left drag = wider, up drag = taller
        setSize({
          w: Math.max(MIN_W, startSize.w - dx),
          h: Math.max(MIN_H, startSize.h - dy),
        });
      }
    };

    const onUp = () => { interact.current.type = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  return (
    <>
      {/* Toggle button when PiP is closed */}
      {!visible && (
        <button
          onClick={startStream}
          title="Open camera"
          className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-zinc-800 border border-zinc-600 hover:bg-zinc-700 hover:border-orange-500 transition-all flex items-center justify-center shadow-lg"
        >
          <CamIcon />
        </button>
      )}

      {/* PiP window */}
      {visible && (
        <div
          ref={pipRef}
          style={{ right: pos.x, bottom: pos.y, width: size.w, height: size.h }}
          className="fixed z-50 flex flex-col rounded-xl overflow-hidden shadow-2xl border border-zinc-700 bg-zinc-900"
        >
          {/* Title bar — drag handle */}
          <div
            onMouseDown={onMoveMouseDown}
            className="flex items-center justify-between px-2 py-1.5 bg-zinc-800 cursor-grab active:cursor-grabbing shrink-0 select-none"
          >
            <span className="text-xs text-zinc-400 font-medium">Interview Cam</span>
            <div className="flex items-center gap-1">
              <ControlBtn onMouseDown={(e) => e.stopPropagation()} onClick={toggleMute} active={muted} title={muted ? "Unmute" : "Mute"}>
                {muted ? <MicOffIcon /> : <MicIcon />}
              </ControlBtn>
              <ControlBtn onMouseDown={(e) => e.stopPropagation()} onClick={toggleCam} active={camOff} title={camOff ? "Camera on" : "Camera off"}>
                {camOff ? <CamOffIcon /> : <CamIcon />}
              </ControlBtn>
              <ControlBtn onMouseDown={(e) => e.stopPropagation()} onClick={stopStream} title="Close">
                <CloseIcon />
              </ControlBtn>
            </div>
          </div>

          {/* Video area */}
          <div className="relative flex-1 bg-zinc-950 overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-200 ${camOff ? "opacity-0" : "opacity-100"}`}
            />
            {camOff && (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
                <CamOffIcon className="w-10 h-10" />
              </div>
            )}
            {muted && (
              <div className="absolute bottom-2 left-2">
                <span className="bg-red-600/80 rounded px-1.5 py-0.5 text-xs text-white">Muted</span>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-20 right-6 z-50 bg-red-900/90 text-red-200 text-xs px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">✕</button>
        </div>
      )}
    </>
  );
}

// ── Shared control button ────────────────────────────────────────────────────
function ControlBtn({ children, active, title, onClick, onMouseDown }: {
  children: React.ReactNode;
  active?: boolean;
  title?: string;
  onClick?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseDown={onMouseDown}
      className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
        active ? "bg-red-600/30 text-red-400" : "hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────
function CamIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M4 8h11a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
    </svg>
  );
}

function CamOffIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 3l18 18M4 8h.01M8 8h3m4 0h.01M15 14H4a1 1 0 01-1-1V9a1 1 0 011-1" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8M3 3l18 18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
