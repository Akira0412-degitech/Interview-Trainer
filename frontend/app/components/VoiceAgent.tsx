"use client";

import { useRef, useState, useEffect } from "react";
import AICam from "./AICam";

type VoiceStatus = "idle" | "connecting" | "connected" | "error";

export function VoiceAgent() {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [aiStream, setAiStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Auto-connect when mounted on the interview page
  useEffect(() => {
    connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = () => {
    dcRef.current?.close();
    dcRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
    setAgentSpeaking(false);
    setAiStream(null);
  };

  const connect = async () => {
    setStatus("connecting");
    try {
      // 1. Mint ephemeral key from our backend
      const tokenRes = await fetch("http://localhost:8080/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      
      });

      if (!tokenRes.ok) throw new Error("Failed to create realtime session");
      const { client_secret } = await tokenRes.json();

      // 2. Create WebRTC peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 3. Wire up AI audio output
      const audioEl = new Audio();
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
        setAiStream(e.streams[0]);
      };

      // 4. Capture mic input
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // 5. Data channel for server events (track agent speaking state)
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === "response.audio.delta") setAgentSpeaking(true);
          if (event.type === "response.audio.done") setAgentSpeaking(false);
          if (event.type === "response.done") setAgentSpeaking(false);
        } catch {
          // non-JSON messages ignored
        }
      };

      // 6. Create SDP offer and exchange with OpenAI Realtime
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${client_secret.value}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        },
      );

      if (!sdpRes.ok) throw new Error(`OpenAI SDP exchange failed: ${sdpRes.status}`);

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          cleanup();
          setStatus("idle");
        }
      };

      setStatus("connected");
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

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M9 11V7a3 3 0 016 0v4a3 3 0 01-6 0z"
      />
    </svg>
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
