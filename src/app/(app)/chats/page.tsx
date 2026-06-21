"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { mapFirestoreError, timeAgo } from "@/lib/utils";
import { getFavoriteRoomIds, listenChatRooms } from "@/services/chatService";
import type { ChatRoom } from "@/models";

export default function ChatsPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    getFavoriteRoomIds().then(setFavorites);
    return listenChatRooms(setRooms, (err) =>
      setError(mapFirestoreError(err.message))
    );
  }, []);

  const sorted = [...rooms].sort((a, b) => {
    const af = favorites.has(a.id) ? 1 : 0;
    const bf = favorites.has(b.id) ? 1 : 0;
    if (af !== bf) return bf - af;
    return (b.lastMessageAt?.seconds ?? 0) - (a.lastMessageAt?.seconds ?? 0);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Chats</h1>
        <Link href="/chats/new" className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black">
          New message
        </Link>
      </div>
      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      {sorted.length === 0 ? (
        <p className="text-slate-400">No chats yet. Start a DM or join a topic room.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((room) => (
            <Link
              key={room.id}
              href={`/chat/${room.id}`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--color-surface)] p-4 hover:border-[var(--color-accent)]/40"
            >
              <div>
                <p className="font-medium">
                  {favorites.has(room.id) && "★ "}
                  {room.title}
                  {room.locked && <span className="ml-2 text-xs text-orange-300">locked</span>}
                </p>
                <p className="line-clamp-1 text-sm text-slate-400">{room.lastMessagePreview || "No messages yet"}</p>
              </div>
              <span className="text-xs text-slate-500">{timeAgo(room.lastMessageAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}