"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FavoriteStar } from "@/components/FavoriteStar";
import { PageHeader } from "@/components/ui/PageHeader";
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
  { key: "privateGroups" as const, title: "Private groups" },
  { key: "publicGroups" as const, title: "Public groups", browseTopics: true },
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
    <div>
      <PageHeader
        title="Messages"
        actions={
          <div className="flex gap-2 text-sm">
            <Link href="/chats/group/new" className="codex-btn-ghost rounded-full px-3 py-1.5">
              New group
            </Link>
            <Link href="/chats/new" className="codex-btn-accent rounded-full px-3 py-1.5">
              New DM
            </Link>
          </div>
        }
      />

      {error && (
        <p className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {!hasRooms ? (
        <p className="px-4 py-12 text-center codex-text-muted">
          No chats yet. Start a DM or{" "}
          <Link href="/topics" className="text-[var(--color-accent)] hover:underline">
            browse topics
          </Link>
          .
        </p>
      ) : (
        <div>
          {sections.map((section) => (
            <section key={section.key}>
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide codex-text-muted">
                  {section.title}
                </p>
                {section.browseTopics && (
                  <Link href="/topics" className="text-xs text-[var(--color-accent)] hover:underline">
                    Browse topics
                  </Link>
                )}
              </div>
              {section.rooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/chat/${room.id}`}
                  className="codex-list-row flex items-center gap-3"
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
                        <span className="ml-2 text-xs text-emerald-300">voice</span>
                      )}
                      {room.locked && <span className="ml-2 text-xs text-orange-300">locked</span>}
                    </p>
                    <p className="line-clamp-1 text-sm codex-text-muted">
                      {room.lastMessagePreview || "No messages yet"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs codex-text-muted">
                    {timeAgo(room.lastMessageAt)}
                  </span>
                </Link>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}