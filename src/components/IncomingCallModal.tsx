"use client";

import { UserAvatar } from "@/components/UserAvatar";
import type { VoiceSession } from "@/models";

interface IncomingCallModalProps {
  session: VoiceSession | null;
  callerName: string;
  callerPhotoUrl?: string | null;
  onAccept: () => void;
  onReject: () => void;
  onIgnore: () => void;
  busy?: boolean;
}

export function IncomingCallModal({
  session,
  callerName,
  callerPhotoUrl,
  onAccept,
  onReject,
  onIgnore,
  busy = false,
}: IncomingCallModalProps) {
  if (!session) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-labelledby="incoming-call-title"
        aria-describedby="incoming-call-desc"
        className="w-full max-w-sm rounded-2xl border border-emerald-500/40 bg-[var(--color-surface)] p-6 shadow-2xl shadow-emerald-500/10"
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
            <UserAvatar name={callerName} photoUrl={callerPhotoUrl} size="lg" />
          </div>
          <p id="incoming-call-title" className="text-lg font-semibold text-white">
            Incoming voice call
          </p>
          <p id="incoming-call-desc" className="mt-1 text-slate-400">
            <span className="font-medium text-white">{callerName}</span> is calling you
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            <span className="text-lg" aria-hidden>
              ✕
            </span>
            Reject
          </button>
          <button
            type="button"
            onClick={onIgnore}
            disabled={busy}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            <span className="text-lg" aria-hidden>
              −
            </span>
            Ignore
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={busy}
            className="flex flex-col items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
          >
            <span className="text-lg" aria-hidden>
              ✓
            </span>
            {busy ? "..." : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface IncomingCallBannerProps {
  callerName: string;
  onAccept: () => void;
  onReject: () => void;
  onExpand: () => void;
  busy?: boolean;
}

export function IncomingCallBanner({
  callerName,
  onAccept,
  onReject,
  onExpand,
  busy = false,
}: IncomingCallBannerProps) {
  return (
    <div className="fixed left-0 right-0 top-0 z-[90] border-b border-emerald-500/30 bg-emerald-500/15 px-4 py-2 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onExpand}
          className="text-left text-sm text-emerald-100 hover:text-white"
        >
          <span className="font-semibold">{callerName}</span> is calling — tap to respond
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className="rounded-lg border border-red-500/40 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={busy}
            className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-black disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
