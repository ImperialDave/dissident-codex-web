import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import type { LeaderboardEntry } from "@/models";

interface CommunityStripCardProps {
  entry: LeaderboardEntry;
}

export function CommunityStripCard({ entry }: CommunityStripCardProps) {
  return (
    <Link
      href={`/chat/${entry.roomId}`}
      className="block w-56 shrink-0 border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition hover:bg-[color-mix(in_srgb,var(--color-accent)_4%,var(--color-surface))]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate font-medium text-white">{entry.title}</p>
        <span className="shrink-0 text-xs font-semibold text-[var(--color-accent)]">
          #{entry.rank}
        </span>
      </div>
      <p className="mt-1 text-xs codex-text-muted">
        {entry.messageCount} messages
        {entry.activeVoiceSessionId && (
          <span className="ml-2 text-emerald-300">· voice live</span>
        )}
      </p>
      <p className="mt-1 line-clamp-2 text-xs text-slate-400">
        {entry.lastMessagePreview || "No messages yet"}
      </p>
      <p className="mt-2 text-[10px] text-slate-500">{timeAgo(entry.lastMessageAt)}</p>
    </Link>
  );
}