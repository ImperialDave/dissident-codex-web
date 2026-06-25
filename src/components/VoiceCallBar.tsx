"use client";

import type { RefObject } from "react";
import type { VoiceParticipantInfo } from "@/hooks/useVoiceRoom";

interface VoiceCallBarProps {
  connected: boolean;
  connecting: boolean;
  leaving?: boolean;
  muted: boolean;
  participants: VoiceParticipantInfo[];
  error?: string;
  needsAudioUnlock?: boolean;
  onToggleMute: () => void;
  onLeave: () => void | Promise<void>;
  onUnlockAudio?: () => void;
  audioContainerRef?: RefObject<HTMLDivElement>;
  label?: string;
}

export function VoiceCallBar({
  connected,
  connecting,
  leaving = false,
  muted,
  participants,
  error,
  needsAudioUnlock,
  onToggleMute,
  onLeave,
  onUnlockAudio,
  audioContainerRef,
  label = "Voice",
}: VoiceCallBarProps) {
  const showBar = connected || connecting || leaving || Boolean(error) || needsAudioUnlock;
  if (!showBar) return null;

  return (
    <div className="border-b border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
      <div ref={audioContainerRef} className="hidden" aria-hidden />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-200">
            {leaving
              ? "Ending call..."
              : connecting
                ? "Connecting to voice..."
                : `${label} — ${participants.length} in call`}
          </p>
          {needsAudioUnlock && onUnlockAudio && (
            <button
              type="button"
              onClick={onUnlockAudio}
              className="mt-1 text-xs font-medium text-amber-200 underline hover:text-amber-100"
            >
              Tap to enable audio
            </button>
          )}
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
            disabled={!connected || leaving}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-50"
          >
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            onClick={() => void onLeave()}
            disabled={leaving}
            className="rounded-lg bg-red-500/80 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {leaving ? "Ending..." : "End call"}
          </button>
        </div>
      </div>
    </div>
  );
}