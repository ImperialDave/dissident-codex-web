"use client";

import type { VoiceParticipantInfo } from "@/hooks/useVoiceRoom";

interface VoiceCallBarProps {
  connected: boolean;
  connecting: boolean;
  muted: boolean;
  participants: VoiceParticipantInfo[];
  error?: string;
  onToggleMute: () => void;
  onLeave: () => void;
  label?: string;
}

export function VoiceCallBar({
  connected,
  connecting,
  muted,
  participants,
  error,
  onToggleMute,
  onLeave,
  label = "Voice",
}: VoiceCallBarProps) {
  if (!connected && !connecting && !error) return null;

  return (
    <div className="border-b border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-200">
            {connecting ? "Connecting to voice..." : `${label} — ${participants.length} in call`}
          </p>
          {error && <p className="text-xs text-red-300">{error}</p>}
          {connected && participants.length > 0 && (
            <p className="mt-1 text-xs text-slate-400">
              {participants.map((p) => p.name + (p.isSpeaking ? " · speaking" : "")).join(", ")}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            disabled={!connected}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-50"
          >
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-lg bg-red-500/80 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500"
          >
            Leave voice
          </button>
        </div>
      </div>
    </div>
  );
}
