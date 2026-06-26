"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FavoriteStar } from "@/components/FavoriteStar";
import { useDmDisplayNames } from "@/hooks/useDmDisplayNames";
import {
  chatRoomDisplayTitle,
  groupChatRoomsByType,
  sortChatRooms,
} from "@/lib/chatDisplay";
import { mapFirestoreError, timeAgo } from "@/lib/utils";
import { getFavoriteRoomIds, listenChatRooms, toggleFavoriteRoom } from "@/services/chatService";
import { useAuthStore } from "@/stores/authStore";
import type { ChatRoom } from "@/models";

const CHAT_SECTIONS = [
  { key: "dms" as const, title: "DMs" },
  { key: "privateGroups" as const, title: "Private group chats" },
  { key: "publicGroups" as const, title: "Public group chats", browseTopics: true },
];

export default function ChatsPage() {
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const dmDisplayNames = useDmDisplayNames(rooms, user?.uid);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getFavoriteRoomIds().then(setFavorites);
    return listenChatRooms(setRooms, (err) =>
      setError(mapFirestoreError(err.message))
    );
  }, []);

  const sections = useMemo(() => {
    const grouped = groupChatRoomsByType(rooms);
    return CHAT_SECTIONS.map((section) => ({
      ...section,
      rooms: sortChatRooms(grouped[section.key], favorites),
    })).filter((section) => section.rooms.length > 0);
  }, [rooms, favorites]);

  const hasRooms = sections.length > 0;

  async function handleToggleFavorite(roomId: string) {
    setTogglingFavorite(roomId);
    try {
      const nowFav = await toggleFavoriteRoom(roomId);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (nowFav) next.add(roomId);
        else next.delete(roomId);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? mapFirestoreError(err.message) : "Failed to update favorite");
    } finally {
      setTogglingFavorite(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Chats</h1>
        <div className="flex gap-2">
          <Link href="/chats/group/new" className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5">
            New group
          </Link>
          <Link href="/chats/new" className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black">
            New message
          </Link>
        </div>
      </div>
      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      {!hasRooms ? (
        <p className="text-slate-400">
          No chats yet. Start a DM, create a private group, or{" "}
          <Link href="/topics" className="text-[var(--color-accent)] hover:underline">
            browse topics
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.key} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  {section.title}
                </h2>
                {section.browseTopics && (
                  <Link href="/topics" className="text-xs text-[var(--color-accent)] hover:underline">
                    Browse topics
                  </Link>
                )}
              </div>
              <div className="space-y-2">
                {section.rooms.map((room) => (
                  <Link
                    key={room.id}
                    href={`/chat/${room.id}`}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-[var(--color-surface)] p-4 hover:border-[var(--color-accent)]/40"
                  >
                    <FavoriteStar
                      favorited={favorites.has(room.id)}
                      disabled={togglingFavorite === room.id}
                      size="sm"
                      onToggle={() => void handleToggleFavorite(room.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {user?.uid
                          ? chatRoomDisplayTitle(room, user.uid, dmDisplayNames)
                          : room.title}
                        {room.activeVoiceSessionId && (
                          <span className="ml-2 text-xs text-emerald-300">voice active</span>
                        )}
                        {room.locked && <span className="ml-2 text-xs text-orange-300">locked</span>}
                      </p>
                      <p className="line-clamp-1 text-sm text-slate-400">
                        {room.lastMessagePreview || "No messages yet"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">{timeAgo(room.lastMessageAt)}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
