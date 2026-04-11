"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import AICam from "./AICam";

type VoiceStatus = "idle" | "connecting" | "connected" | "error";

// Encode an ArrayBuffer as a base64 string without hitting stack limits
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function VoiceAgent({ sessionId, onRequestEnd }: { sessionId: string; onRequestEnd?: () => void }) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [aiStream, setAiStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const scheduledEndRef = useRef<number>(0);
  const streamDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  // Set to true after an interrupt; audio chunks are ignored until next speaking_start
  const ignoringAudioRef = useRef(false);
  // Deferred speaking-end timer so the icon stays lit until buffered audio finishes
  const speakingEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    connect();
    return () => cleanup();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const cleanup = () => {
    if (workletNodeRef.current) {
      workletNodeRef.current.port.onmessage = null;
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    for (const src of activeSourcesRef.current) {
      try { src.stop(); } catch { /**/ }
    }
    activeSourcesRef.current = [];
    ignoringAudioRef.current = false;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    streamDestRef.current = null;
    scheduledEndRef.current = 0;
    wsRef.current?.close();
    wsRef.current = null;
    if (speakingEndTimerRef.current !== null) {
      clearTimeout(speakingEndTimerRef.current);
      speakingEndTimerRef.current = null;
    }
    setAgentSpeaking(false);
    setAiStream(null);
  };

  // Stop all buffered/scheduled audio immediately (called on interruption)
  const interruptAudio = useCallback(() => {
    ignoringAudioRef.current = true;
    if (speakingEndTimerRef.current !== null) {
      clearTimeout(speakingEndTimerRef.current);
      speakingEndTimerRef.current = null;
    }
    for (const src of activeSourcesRef.current) {
      try { src.stop(); } catch { /**/ }
    }
    activeSourcesRef.current = [];
    scheduledEndRef.current = 0;
    setAgentSpeaking(false);
  }, []);

  // Decode a base64 PCM16 chunk and schedule it for seamless playback
  const playAudioChunk = useCallback((base64Audio: string) => {
    // Discard chunks that arrived after an interruption
    if (ignoringAudioRef.current) return;
    const ctx = audioCtxRef.current;
    const dest = streamDestRef.current;
    if (!ctx || !dest) return;

    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);

    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
    }

    // AudioContext is at 24 kHz to match OpenAI output format
    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    // Also route into the stream destination so AICam can visualise it
    source.connect(dest);

    const startTime = Math.max(ctx.currentTime, scheduledEndRef.current);
    source.start(startTime);
    scheduledEndRef.current = startTime + buffer.duration;

    // Track so we can stop it on interruption
    activeSourcesRef.current.push(source);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
    };
  }, []);

  const connect = async () => {
    setStatus("connecting");
    try {
      // AudioContext at 24 kHz – browser resamples mic input automatically
      const ctx = new AudioContext({ sampleRate: 24000 });
      audioCtxRef.current = ctx;

      // MediaStreamDestination lets AICam analyse the AI's audio
      const dest = ctx.createMediaStreamDestination();
      streamDestRef.current = dest;
      setAiStream(dest.stream);

      // Load the AudioWorklet and open the WebSocket immediately — don't wait
      // for mic permission so the agent can connect and start speaking right away.
      const [protocol] = [window.location.protocol === "https:" ? "wss:" : "ws:"];
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/audio/${sessionId}`);
      wsRef.current = ws;

      // Kick off mic permission request in parallel — wire it up whenever it resolves
      ctx.audioWorklet.addModule("/audio-processor.js").then(() => {
        return navigator.mediaDevices.getUserMedia({ audio: true });
      }).then((micStream) => {
        micStreamRef.current = micStream;
        const micSource = ctx.createMediaStreamSource(micStream);
        const workletNode = new AudioWorkletNode(ctx, "pcm-processor");
        workletNodeRef.current = workletNode;
        micSource.connect(workletNode);
        // Start forwarding mic audio if the WS is already open
        workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          ws.send(JSON.stringify({ type: "audio_input", audio: bufferToBase64(e.data) }));
        };
      }).catch((err) => {
        console.warn("Mic unavailable:", err);
      });

      // Once the WS is open, mic forwarding will begin as soon as permission is granted
      ws.onopen = () => {
        // If the worklet is already wired (mic granted before WS opened), onmessage is set.
        // Nothing extra needed here — forwarding starts automatically.
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string);
          switch (msg.type) {
            case "agent_ready":
              setStatus("connected");
              break;
            case "interrupt":
              interruptAudio();
              break;
            case "audio_output":
              playAudioChunk(msg.audio as string);
              break;
            case "speaking_start":
              ignoringAudioRef.current = false;
              // Cancel any pending speaking-end timer for back-to-back utterances
              if (speakingEndTimerRef.current !== null) {
                clearTimeout(speakingEndTimerRef.current);
                speakingEndTimerRef.current = null;
              }
              setAgentSpeaking(true);
              break;
            case "speaking_end": {
              // Delay the state flip until all buffered audio has actually played
              const ctx = audioCtxRef.current;
              const remaining = ctx
                ? Math.max(0, (scheduledEndRef.current - ctx.currentTime) * 1000)
                : 0;
              if (speakingEndTimerRef.current !== null) clearTimeout(speakingEndTimerRef.current);
              speakingEndTimerRef.current = setTimeout(() => {
                speakingEndTimerRef.current = null;
                setAgentSpeaking(false);
              }, remaining);
              break;
            }
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (workletNodeRef.current) workletNodeRef.current.port.onmessage = null;
        setStatus("idle");
        setAgentSpeaking(false);
      };

      ws.onerror = () => {
        cleanup();
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      };
    } catch (err) {
      console.error("VoiceAgent error:", err);
      cleanup();
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const disconnect = () => {
    cleanup();
    setStatus("idle");
  };

  const toggleMute = () => {
    const mic = micStreamRef.current;
    if (!mic) return;
    const next = !muted;
    mic.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setMuted(next);
  };

  if (status === "idle" || status === "connecting") {
    return (
      <div className="fixed bottom-6 right-20 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-zinc-400 bg-zinc-800 shadow-lg">
        <span className="inline-block w-3 h-3 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
        Connecting…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="fixed bottom-6 right-20 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-red-400 bg-zinc-800 shadow-lg">
        <span>Connection failed</span>
      </div>
    );
  }

  // connected
  return (
    <>
      <AICam stream={aiStream} speaking={agentSpeaking} camOff={camOff} />
      {/* Zoom-style call toolbar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900/90 backdrop-blur-md border border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {/* Mute */}
        <CallButton
          onClick={toggleMute}
          active={muted}
          activeClass="bg-zinc-100 text-zinc-900"
          inactiveClass="bg-zinc-700/70 hover:bg-zinc-600/80 text-white"
          title={muted ? "Unmute" : "Mute"}
          label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOffIcon className="w-4 h-4" /> : <MicIcon className="w-4 h-4" />}
        </CallButton>

        {/* Camera / hide AICam */}
        <CallButton
          onClick={() => setCamOff((v) => !v)}
          active={camOff}
          activeClass="bg-zinc-100 text-zinc-900"
          inactiveClass="bg-zinc-700/70 hover:bg-zinc-600/80 text-white"
          title={camOff ? "Show AI cam" : "Hide AI cam"}
          label={camOff ? "Show" : "Hide"}
        >
          {camOff ? <VideoOffIcon className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
        </CallButton>

        {/* Divider */}
        <div className="w-px h-8 bg-white/10 mx-1" />

        {/* Agent speaking indicator */}
        <div className="flex flex-col items-center gap-0.5 w-14">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${agentSpeaking ? "bg-sky-400" : "bg-zinc-500"} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${agentSpeaking ? "bg-sky-400" : "bg-zinc-500"}`} />
          </span>
          <span className={`text-[9px] font-medium uppercase tracking-widest ${agentSpeaking ? "text-sky-400" : "text-zinc-500"}`}>
            {agentSpeaking ? "Speaking" : "Listening"}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-white/10 mx-1" />

        {/* Hang up */}
        <CallButton
          onClick={() => { onRequestEnd?.(); disconnect(); }}
          active={false}
          activeClass=""
          inactiveClass="bg-red-600 hover:bg-red-500 text-white"
          title="End interview"
          label="End"
        >
          <PhoneOffIcon className="w-4 h-4" />
        </CallButton>
      </div>
    </>
  );
}

function CallButton({
  children, onClick, active, activeClass, inactiveClass, title, label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  activeClass: string;
  inactiveClass: string;
  title: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex flex-col items-center gap-0.5 w-14 py-1.5 rounded-xl transition-colors ${
        active ? activeClass : inactiveClass
      }`}
    >
      <span className="flex items-center justify-center w-7 h-7">{children}</span>
      <span className="text-[9px] font-medium tracking-wide">{label}</span>
    </button>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
    </svg>
  );
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 16.95A7 7 0 0 1 5 10v-1M12 19v4M8 23h8" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 10l4.553-2.276A1 1 0 0 1 21 8.723v6.554a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
    </svg>
  );
}

function VideoOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2M20 12l-4-4v3.5M1 1l22 22" />
    </svg>
  );
}

function PhoneOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c1.12.45 2.3.77 3.53.9a2 2 0 0 1 1.8 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.17 2H6a2 2 0 0 1 2 1.72 12.05 12.05 0 0 0 .9 3.53 2 2 0 0 1-.45 2.11L7.18 10.5a16 16 0 0 0 3.5 2.81zM1 1l22 22" />
    </svg>
  );
}
