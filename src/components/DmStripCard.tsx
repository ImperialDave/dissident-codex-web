import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import type { ChatRoom } from "@/models";

interface DmStripCardProps {
  room: ChatRoom;
  displayTitle?: string;
}

export function DmStripCard({ room, displayTitle }: DmStripCardProps) {
  return (
    <Link
      href={`/chat/${room.id}`}
      className="block w-56 shrink-0 border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition hover:bg-[color-mix(in_srgb,var(--color-accent)_4%,var(--color-surface))]"
    >
      <p className="truncate font-medium text-white">{displayTitle ?? room.title}</p>
      <p className="mt-1 line-clamp-2 text-xs text-slate-400">
        {room.lastMessagePreview || "No messages yet"}
      </p>
      <p className="mt-2 text-[10px] text-slate-500">{timeAgo(room.lastMessageAt)}</p>
    </Link>
  );
}
