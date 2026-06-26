"use client";

import type { RefObject } from "react";
import type { VoiceParticipantInfo } from "@/hooks/useVoiceRoom";

export type VoiceCallPhase =
  | "idle"
  | "ringing-caller"
  | "ringing-callee"
  | "join-ready"
  | "connecting"
  | "connected";

export interface VoiceCallBarProps {
  phase: VoiceCallPhase;
  variant?: "inline" | "floating";
  connected: boolean;
  connecting: boolean;
  leaving?: boolean;
  muted: boolean;
  participants: VoiceParticipantInfo[];
  error?: string;
  needsAudioUnlock?: boolean;
  needsJoin?: boolean;
  needsManualJoin?: boolean;
  connectFailed?: boolean;
  manualJoinBusy?: boolean;
  voiceBusy?: boolean;
  voiceLocked?: boolean;
  showIdleDmButton?: boolean;
  showIdleChannelButton?: boolean;
  showChannelRejoin?: boolean;
  onStartDmCall?: () => void;
  onJoinChannel?: () => void;
  onCancelRinging?: () => void;
  onToggleMute: () => void;
  onLeave: () => void | Promise<void>;
  onUnlockAudio?: () => void;
  onManualJoin?: () => void;
  onRetryConnect?: () => void;
  audioContainerRef?: RefObject<HTMLDivElement>;
  label?: string;
}

export function VoiceCallBar({
  phase,
  variant = "inline",
  connected,
  connecting,
  leaving = false,
  muted,
  participants,
  error,
  needsAudioUnlock,
  needsJoin,
  needsManualJoin,
  connectFailed = false,
  manualJoinBusy = false,
  voiceBusy = false,
  voiceLocked = false,
  showIdleDmButton = false,
  showIdleChannelButton = false,
  showChannelRejoin = false,
  onStartDmCall,
  onJoinChannel,
  onCancelRinging,
  onToggleMute,
  onLeave,
  onUnlockAudio,
  onManualJoin,
  onRetryConnect,
  audioContainerRef,
  label = "Voice",
}: VoiceCallBarProps) {
  const showPanel =
    phase !== "idle" ||
    showIdleDmButton ||
    showIdleChannelButton ||
    showChannelRejoin ||
    connected ||
    connecting ||
    leaving ||
    Boolean(error) ||
    needsAudioUnlock ||
    needsJoin;

  if (!showPanel) return null;

  const headerText = (() => {
    if (leaving) return "Ending call...";
    if (phase === "ringing-caller") return `${label} — waiting for answer`;
    if (phase === "ringing-callee") return `${label} — incoming call`;
    if (connecting) return "Connecting to voice...";
    if (needsJoin) return `${label} — ready to join`;
    if (connected) return `${label} — ${participants.length} in call`;
    return label;
  })();

  const showEndCall = connected || phase === "join-ready" || phase === "connecting";

  const containerClass =
    variant === "floating"
      ? "fixed bottom-20 left-3 right-3 z-40 mx-auto max-w-lg rounded-xl border border-emerald-500/40 bg-emerald-950/95 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-md lg:bottom-6"
      : `border-b border-emerald-500/30 bg-emerald-500/10 px-4 py-3 ${phase !== "idle" ? "min-h-[3.5rem]" : ""}`;

  return (
    <div className={containerClass}>
      <div ref={audioContainerRef} className="hidden" aria-hidden />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {phase === "idle" && showIdleDmButton && (
            <button
              type="button"
              onClick={onStartDmCall}
              disabled={voiceBusy || voiceLocked}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-50"
            >
              {voiceBusy ? "Calling..." : "Voice call"}
            </button>
          )}
          {phase === "idle" && showIdleChannelButton && (
            <button
              type="button"
              onClick={onJoinChannel}
              disabled={voiceBusy || voiceLocked}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-50"
            >
              {voiceBusy ? "Joining..." : "Join voice"}
            </button>
          )}
          {phase === "idle" && showChannelRejoin && (
            <button
              type="button"
              onClick={onJoinChannel}
              disabled={voiceBusy}
              className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-sm text-emerald-200 disabled:opacity-50"
            >
              Rejoin voice
            </button>
          )}

          {phase !== "idle" && (
            <p className="text-sm font-semibold text-emerald-200">{headerText}</p>
          )}

          {phase === "ringing-callee" && (
            <p className="mt-1 text-xs text-slate-400">Use the pop-up to accept or decline</p>
          )}

          {needsManualJoin && onManualJoin && (
            <button
              type="button"
              onClick={onManualJoin}
              disabled={manualJoinBusy}
              className="mt-2 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              {manualJoinBusy ? "Joining..." : "Enable microphone and join"}
            </button>
          )}

          {needsJoin && !needsManualJoin && onRetryConnect && (
            <button
              type="button"
              onClick={onRetryConnect}
              disabled={manualJoinBusy || connecting}
              className="mt-2 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              {manualJoinBusy ? "Joining..." : connectFailed || error ? "Try again" : "Join call"}
            </button>
          )}

          {needsAudioUnlock && onUnlockAudio && (
            <button
              type="button"
              onClick={onUnlockAudio}
              className="mt-1 text-xs font-medium text-amber-200 underline hover:text-amber-100"
            >
              Tap to enable speaker audio
            </button>
          )}

          {error && <p className="mt-1 text-xs text-red-300">{error}</p>}

          {connected && participants.length > 0 && (
            <p className="mt-1 text-xs text-slate-400">
              {participants.map((p) => p.name + (p.isSpeaking ? " · speaking" : "")).join(", ")}
            </p>
          )}

          {voiceLocked && phase === "idle" && (
            <span className="text-xs text-orange-300">Voice locked</span>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          {phase === "ringing-caller" && onCancelRinging && (
            <button
              type="button"
              onClick={onCancelRinging}
              disabled={voiceBusy}
              className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              Cancel call
            </button>
          )}
          {showEndCall && (
            <>
              {connected && (
                <button
                  type="button"
                  onClick={onToggleMute}
                  disabled={leaving}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-50"
                >
                  {muted ? "Unmute" : "Mute"}
                </button>
              )}
              <button
                type="button"
                onClick={() => void onLeave()}
                disabled={leaving}
                className="rounded-lg bg-red-500/80 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {leaving ? "Ending..." : "End call"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
