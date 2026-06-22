"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FavoriteStar } from "@/components/FavoriteStar";
import { mapFirestoreError, timeAgo } from "@/lib/utils";
import { getFavoriteRoomIds, listenChatRooms, toggleFavoriteRoom } from "@/services/chatService";
import type { ChatRoom } from "@/models";

export default function ChatsPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);
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
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-[var(--color-surface)] p-4 hover:border-[var(--color-accent)]/40"
            >
              <FavoriteStar
                favorited={favorites.has(room.id)}
                disabled={togglingFavorite === room.id}
                size="sm"
                onToggle={async () => {
                  setTogglingFavorite(room.id);
                  try {
                    const nowFav = await toggleFavoriteRoom(room.id);
                    setFavorites((prev) => {
                      const next = new Set(prev);
                      if (nowFav) next.add(room.id);
                      else next.delete(room.id);
                      return next;
                    });
                  } catch (err) {
                    setError(err instanceof Error ? mapFirestoreError(err.message) : "Failed to update favorite");
                  } finally {
                    setTogglingFavorite(null);
                  }
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {room.title}
                  {room.locked && <span className="ml-2 text-xs text-orange-300">locked</span>}
                </p>
                <p className="line-clamp-1 text-sm text-slate-400">{room.lastMessagePreview || "No messages yet"}</p>
              </div>
              <span className="shrink-0 text-xs text-slate-500">{timeAgo(room.lastMessageAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
