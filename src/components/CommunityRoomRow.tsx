import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import type { LeaderboardEntry } from "@/models";

interface CommunityRoomRowProps {
  entry: LeaderboardEntry;
  showRank?: boolean;
  linkTo?: "chat" | "posts";
}

export function communityEntryMeta(entry: LeaderboardEntry): string {
  return `${entry.messageCount} messages · ${entry.postCount} posts`;
}

export function CommunityRoomRow({
  entry,
  showRank = true,
  linkTo = "chat",
}: CommunityRoomRowProps) {
  const href =
    linkTo === "posts" && entry.isTopic
      ? `/topics/${encodeURIComponent(entry.title)}`
      : `/chat/${entry.roomId}`;

  return (
    <Link href={href} className="codex-list-row block">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {showRank && (
              <span className="mr-2 text-[var(--color-accent)]">#{entry.rank}</span>
            )}
            {entry.title}
            {entry.activeVoiceSessionId && (
              <span className="ml-2 text-xs text-emerald-300">voice live</span>
            )}
            {entry.locked && (
              <span className="ml-2 text-xs text-orange-300">locked</span>
            )}
          </p>
          <p className="mt-0.5 text-xs codex-text-muted">{communityEntryMeta(entry)}</p>
          {entry.lastMessagePreview && (
            <p className="mt-1 line-clamp-1 text-xs text-slate-400">
              {entry.lastMessagePreview}
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs codex-text-muted">{timeAgo(entry.lastMessageAt)}</span>
      </div>
    </Link>
  );
}