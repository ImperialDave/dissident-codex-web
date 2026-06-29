"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CommunityRoomRow } from "@/components/CommunityRoomRow";
import { PostCard } from "@/components/PostCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import clsx from "clsx";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { chatRoomDisplayTitle, resolveDmDisplayNames } from "@/lib/chatDisplay";
import { mapFirestoreError } from "@/lib/utils";
import {
  getPopularChatRoomsForSearch,
  getPopularTopicsForSearch,
  searchTopics,
} from "@/services/categoryService";
import {
  refreshSavedPostIds,
  searchPosts,
  toggleSavePost,
} from "@/services/postService";
import { getChatRoomsForInbox, searchChatRooms } from "@/services/chatService";
import { searchUsers } from "@/services/userService";
import { useAuthStore } from "@/stores/authStore";
import type { ChatRoom, LeaderboardEntry, Post, PostCategory, User } from "@/models";

function topicEntryMeta(entry: LeaderboardEntry): string {
  return `${entry.postCount} posts · ${entry.messageCount} messages`;
}

export default function SearchPage() {
  const { user } = useAuthStore();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"posts" | "topics" | "chats" | "users">("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [topics, setTopics] = useState<PostCategory[]>([]);
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [chatDisplayNames, setChatDisplayNames] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [popularTopics, setPopularTopics] = useState<LeaderboardEntry[]>([]);
  const [popularChats, setPopularChats] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(true);
  const [discoveryError, setDiscoveryError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [togglingSavePostId, setTogglingSavePostId] = useState<string | null>(null);

  const showSearchResults = query.trim().length > 0 && hasSearched;

  useEffect(() => {
    if (!user) return;
    refreshSavedPostIds().then(setSavedPostIds);
  }, [user]);

  useEffect(() => {
    setDiscoveryLoading(true);
    setDiscoveryError("");
    Promise.all([getPopularTopicsForSearch(), getPopularChatRoomsForSearch()])
      .then(([topicsResult, chatsResult]) => {
        setPopularTopics(topicsResult);
        setPopularChats(chatsResult);
      })
      .catch((err) => {
        setPopularTopics([]);
        setPopularChats([]);
        setDiscoveryError(
          mapFirestoreError(err instanceof Error ? err.message : "Failed to load popular lists")
        );
      })
      .finally(() => setDiscoveryLoading(false));
  }, []);

  async function handleToggleSave(postId: string) {
    setTogglingSavePostId(postId);
    setError("");
    try {
      const nowSaved = await toggleSavePost(postId);
      setSavedPostIds((prev) => {
        const next = new Set(prev);
        if (nowSaved) next.add(postId);
        else next.delete(postId);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? mapFirestoreError(err.message) : "Failed to update save");
    } finally {
      setTogglingSavePostId(null);
    }
  }

  async function search() {
    const q = query.trim();
    if (!q) return;

    setHasSearched(true);
    setLoading(true);
    setError("");
    setPosts([]);
    setTopics([]);
    setChats([]);
    setChatDisplayNames({});
    setUsers([]);

    const myUid = user?.uid;

    const [postsResult, topicsResult, chatsResult, usersResult] = await Promise.allSettled([
      searchPosts(q),
      searchTopics(q),
      getChatRoomsForInbox().then(async (rooms) => {
        const displayNamesByUid = myUid ? await resolveDmDisplayNames(rooms, myUid) : {};
        return {
          matches: searchChatRooms(q, rooms, 20, { myUid, displayNamesByUid }),
          displayNamesByUid,
        };
      }),
      searchUsers(q),
    ]);

    const errors: string[] = [];

    const formatError = (err: unknown) =>
      mapFirestoreError(err instanceof Error ? err.message : String(err));

    if (postsResult.status === "fulfilled") {
      setPosts(postsResult.value);
    } else {
      errors.push(`Posts: ${formatError(postsResult.reason)}`);
    }

    if (topicsResult.status === "fulfilled") {
      setTopics(topicsResult.value);
    } else {
      errors.push(`Topics: ${formatError(topicsResult.reason)}`);
    }

    if (chatsResult.status === "fulfilled") {
      setChats(chatsResult.value.matches);
      setChatDisplayNames(chatsResult.value.displayNamesByUid);
    } else {
      errors.push(`Chats: ${formatError(chatsResult.reason)}`);
    }

    if (usersResult.status === "fulfilled") {
      setUsers(usersResult.value);
    } else {
      errors.push(`Users: ${formatError(usersResult.reason)}`);
    }

    if (errors.length === 4) {
      setError(errors.join(" · "));
    } else if (errors.length > 0) {
      setError(errors.join(" · "));
    }

    setLoading(false);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setHasSearched(false);
    }
  }

  return (
    <div>
      <PageHeader title="Search" />
      <div className="flex gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <Input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Search Codex"
          className="flex-1"
        />
        <button
          onClick={search}
          disabled={loading || !query.trim()}
          className="codex-btn-accent shrink-0 rounded-full px-4 py-2 disabled:opacity-50"
        >
          {loading ? "..." : "Go"}
        </button>
      </div>

      {error && (
        <div className="border-b border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {discoveryError && (
        <div className="border-b border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {discoveryError}
        </div>
      )}

      <div className="codex-tab-bar">
        {(["posts", "topics", "chats", "users"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx("codex-tab capitalize", tab === t && "codex-tab-active")}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "posts" && (
        <div>
          {posts.length === 0 ? (
            <p className="px-4 py-8 text-center codex-text-muted">No matching posts.</p>
          ) : (
            posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                saved={savedPostIds.has(p.id)}
                togglingSave={togglingSavePostId === p.id}
                onToggleSave={handleToggleSave}
              />
            ))
          )}
        </div>
      )}

      {tab === "topics" && (
        <div>
          {showSearchResults ? (
            topics.length === 0 ? (
              <p className="px-4 py-8 text-center codex-text-muted">No matching topics.</p>
            ) : (
              topics.map((t) => (
                <Link
                  key={`${t.id}-${t.name}`}
                  href={`/feed?category=${encodeURIComponent(t.name)}`}
                  className="codex-list-row block"
                >
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs codex-text-muted">View posts in this topic</p>
                </Link>
              ))
            )
          ) : discoveryLoading ? (
            <p className="px-4 py-8 text-center codex-text-muted">Loading popular topics...</p>
          ) : popularTopics.length === 0 ? (
            <p className="px-4 py-8 text-center codex-text-muted">
              No popular topics yet.{" "}
              <Link href="/topics" className="text-[var(--color-accent)] hover:underline">
                Browse topics
              </Link>
            </p>
          ) : (
            <div>
              <p className="border-b border-[var(--color-border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide codex-text-muted">
                Popular topics
              </p>
              {popularTopics.map((entry) => (
                <Link
                  key={entry.roomId}
                  href={`/feed?category=${encodeURIComponent(entry.title)}`}
                  className="codex-list-row block"
                >
                  <p className="font-medium">
                    <span className="mr-2 text-[var(--color-accent)]">#{entry.rank}</span>
                    {entry.title}
                  </p>
                  <p className="mt-0.5 text-xs codex-text-muted">{topicEntryMeta(entry)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "chats" && (
        <div>
          {showSearchResults ? (
            chats.length === 0 ? (
              <p className="px-4 py-8 text-center codex-text-muted">No matching chats.</p>
            ) : (
              chats.map((c) => (
                <Link key={c.id} href={`/chat/${c.id}`} className="codex-list-row block font-medium">
                  {user?.uid
                    ? chatRoomDisplayTitle(c, user.uid, chatDisplayNames)
                    : c.title}
                </Link>
              ))
            )
          ) : discoveryLoading ? (
            <p className="px-4 py-8 text-center codex-text-muted">Loading popular communities...</p>
          ) : popularChats.length === 0 ? (
            <p className="px-4 py-8 text-center codex-text-muted">
              No popular communities yet.{" "}
              <Link href="/topics" className="text-[var(--color-accent)] hover:underline">
                Browse topics
              </Link>
            </p>
          ) : (
            <div>
              <p className="border-b border-[var(--color-border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide codex-text-muted">
                Popular communities
              </p>
              {popularChats.map((entry) => (
                <CommunityRoomRow key={entry.roomId} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "users" && (
        <div>
          {users.length === 0 ? (
            <p className="px-4 py-8 text-center codex-text-muted">No matching users.</p>
          ) : (
            users.map((u) => (
              <Link
                key={u.uid}
                href={`/user/${u.uid}`}
                className="codex-list-row flex items-center gap-3"
              >
                <UserAvatar name={u.displayName} photoUrl={u.photoUrl} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{u.displayName}</p>
                    <RoleBadge role={u.role} />
                  </div>
                  {u.flair && (
                    <p className="text-xs text-[var(--color-accent)]">{u.flair}</p>
                  )}
                  {u.bio && (
                    <p className="truncate text-xs text-slate-400">{u.bio}</p>
                  )}
                </div>
                <span className="text-xs text-slate-500">View profile</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}