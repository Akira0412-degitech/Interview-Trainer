"use client";

import { useRef, useState, useEffect, useCallback } from "react";
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

export function VoiceAgent({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [aiStream, setAiStream] = useState<MediaStream | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const scheduledEndRef = useRef<number>(0);
  const streamDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

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
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    streamDestRef.current = null;
    scheduledEndRef.current = 0;
    wsRef.current?.close();
    wsRef.current = null;
    setAgentSpeaking(false);
    setAiStream(null);
  };

  // Decode a base64 PCM16 chunk and schedule it for seamless playback
  const playAudioChunk = useCallback((base64Audio: string) => {
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

      // Load the AudioWorklet that converts Float32 → Int16 PCM
      await ctx.audioWorklet.addModule("/audio-processor.js");

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;

      const micSource = ctx.createMediaStreamSource(micStream);
      const workletNode = new AudioWorkletNode(ctx, "pcm-processor");
      workletNodeRef.current = workletNode;

      // Wire up the mic → worklet but don't send until the WS is open
      micSource.connect(workletNode);

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/audio/${sessionId}`);
      wsRef.current = ws;

      // Once the WS is open, forward every PCM chunk from the worklet
      ws.onopen = () => {
        workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          ws.send(JSON.stringify({ type: "audio_input", audio: bufferToBase64(e.data) }));
        };
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string);
          switch (msg.type) {
            case "agent_ready":
              setStatus("connected");
              break;
            case "audio_output":
              playAudioChunk(msg.audio as string);
              break;
            case "speaking_start":
              setAgentSpeaking(true);
              break;
            case "speaking_end":
              setAgentSpeaking(false);
              break;
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
      <AICam stream={aiStream} speaking={agentSpeaking} />
      <div className="fixed bottom-6 right-20 z-40 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-zinc-800 text-zinc-200">
          {agentSpeaking ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-emerald-400">Speaking</span>
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-400" />
              </span>
              <span>Listening</span>
            </>
          )}
        </div>
        <button
          onClick={disconnect}
          title="End voice session"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-red-700 hover:bg-red-600 transition-colors text-white"
        >
          <PhoneOffIcon className="w-3.5 h-3.5" />
          End
        </button>
      </div>
    </>
  );
}

function PhoneOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a16.001 16.001 0 0114 14M3 3l18 18"
      />
    </svg>
  );
}
