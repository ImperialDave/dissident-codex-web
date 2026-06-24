import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import type { ChatRoom } from "@/models";

interface DmStripCardProps {
  room: ChatRoom;
}

export function DmStripCard({ room }: DmStripCardProps) {
  return (
    <Link
      href={`/chat/${room.id}`}
      className="codex-surface block w-56 shrink-0 rounded-xl border border-white/10 p-3 transition hover:border-[var(--color-accent)]/40"
    >
      <p className="truncate font-medium text-white">{room.title}</p>
      <p className="mt-1 line-clamp-2 text-xs text-slate-400">
        {room.lastMessagePreview || "No messages yet"}
      </p>
      <p className="mt-2 text-[10px] text-slate-500">{timeAgo(room.lastMessageAt)}</p>
    </Link>
  );
}
