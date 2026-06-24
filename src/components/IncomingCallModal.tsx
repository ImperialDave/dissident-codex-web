"use client";

import type { VoiceSession } from "@/models";

interface IncomingCallModalProps {
  session: VoiceSession | null;
  callerName: string;
  onAccept: () => void;
  onDecline: () => void;
  busy?: boolean;
}

export function IncomingCallModal({
  session,
  callerName,
  onAccept,
  onDecline,
  busy = false,
}: IncomingCallModalProps) {
  if (!session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-xl border border-emerald-500/30 bg-[var(--color-surface)] p-6 shadow-2xl">
        <p className="text-center text-lg font-semibold text-white">Incoming voice call</p>
        <p className="mt-2 text-center text-slate-400">{callerName} is calling you</p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onDecline}
            disabled={busy}
            className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={busy}
            className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
