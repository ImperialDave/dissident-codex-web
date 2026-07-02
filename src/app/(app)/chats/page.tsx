"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { CommunityRoomRow } from "@/components/CommunityRoomRow";
import { FavoriteStar } from "@/components/FavoriteStar";
import { PageHeader } from "@/components/ui/PageHeader";
import { useDmDisplayNames } from "@/hooks/useDmDisplayNames";
import {
  chatRoomDisplayTitle,
  groupChatRoomsByType,
  sortChatRooms,
} from "@/lib/chatDisplay";
import { COMMUNITIES_BROWSE_LIMIT } from "@/lib/constants";
import { mapFirestoreError, timeAgo, sanitizeUserError } from "@/lib/utils";
import { getRankedTopicCommunities } from "@/services/categoryService";
import { getFavoriteRoomIds, listenChatRooms, toggleFavoriteRoom } from "@/services/chatService";
import { useAuthStore } from "@/stores/authStore";
import type { ChatRoom, LeaderboardEntry } from "@/models";

const INBOX_SECTIONS = [
  { key: "dms" as const, title: "DMs" },
  { key: "privateGroups" as const, title: "Your groups" },
] as const;

type ChatsTab = "communities" | "inbox";

export default function ChatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: ChatsTab = tabParam === "inbox" ? "inbox" : "communities";

  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [communities, setCommunities] = useState<LeaderboardEntry[]>([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(true);
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

  useEffect(() => {
    setCommunitiesLoading(true);
    getRankedTopicCommunities(COMMUNITIES_BROWSE_LIMIT, "chat")
      .then(setCommunities)
      .catch((err) => {
        setCommunities([]);
        setError(mapFirestoreError(sanitizeUserError(err, "Failed to load communities")));
      })
      .finally(() => setCommunitiesLoading(false));
  }, []);

  const inboxSections = useMemo(() => {
    const grouped = groupChatRoomsByType(rooms);
    return INBOX_SECTIONS.map((section) => ({
      ...section,
      rooms: sortChatRooms(grouped[section.key], favorites),
    })).filter((section) => section.rooms.length > 0);
  }, [rooms, favorites]);

  const hasInbox = inboxSections.length > 0;

  function setTab(next: ChatsTab) {
    router.replace(next === "inbox" ? "/chats?tab=inbox" : "/chats");
  }

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
        title="Communities"
        actions={
          tab === "inbox" ? (
            <div className="flex gap-2 text-sm">
              <Link href="/chats/group/new" className="codex-btn-ghost rounded-full px-3 py-1.5">
                New group
              </Link>
              <Link href="/chats/new" className="codex-btn-accent rounded-full px-3 py-1.5">
                New DM
              </Link>
            </div>
          ) : (
            <Link href="/topics" className="codex-btn-ghost rounded-full px-3 py-1.5 text-sm">
              Browse topics
            </Link>
          )
        }
      />

      <div className="codex-tab-bar">
        {(
          [
            { id: "communities" as const, label: "Communities" },
            { id: "inbox" as const, label: "Inbox" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={clsx("codex-tab", tab === item.id && "codex-tab-active")}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {tab === "communities" && (
        <div>
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide codex-text-muted">
              Active communities
            </p>
            <Link href="/topics" className="text-xs text-[var(--color-accent)] hover:underline">
              Browse all topics
            </Link>
          </div>

          {communitiesLoading ? (
            <p className="px-4 py-8 text-center codex-text-muted">Loading communities...</p>
          ) : communities.length === 0 ? (
            <p className="px-4 py-12 text-center codex-text-muted">
              No active communities yet.{" "}
              <Link href="/topics" className="text-[var(--color-accent)] hover:underline">
                Browse topics
              </Link>{" "}
              to join a chat.
            </p>
          ) : (
            communities.map((entry) => (
              <CommunityRoomRow key={entry.roomId} entry={entry} />
            ))
          )}
        </div>
      )}

      {tab === "inbox" && (
        <div>
          {!hasInbox ? (
            <p className="px-4 py-12 text-center codex-text-muted">
              No personal chats yet. Start a{" "}
              <Link href="/chats/new" className="text-[var(--color-accent)] hover:underline">
                DM
              </Link>{" "}
              or{" "}
              <Link href="/chats/group/new" className="text-[var(--color-accent)] hover:underline">
                group
              </Link>
              .
            </p>
          ) : (
            inboxSections.map((section) => (
              <section key={section.key}>
                <div className="border-b border-[var(--color-border)] px-4 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide codex-text-muted">
                    {section.title}
                  </p>
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
            ))
          )}
        </div>
      )}
    </div>
  );
}