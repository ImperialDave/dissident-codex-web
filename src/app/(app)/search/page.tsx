"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { chatRoomDisplayTitle, resolveDmDisplayNames } from "@/lib/chatDisplay";
import { mapFirestoreError } from "@/lib/utils";
import { searchTopics } from "@/services/categoryService";
import {
  refreshSavedPostIds,
  searchPosts,
  toggleSavePost,
} from "@/services/postService";
import { getChatRoomsForInbox, searchChatRooms } from "@/services/chatService";
import { searchUsers } from "@/services/userService";
import { useAuthStore } from "@/stores/authStore";
import type { ChatRoom, Post, PostCategory, User } from "@/models";

export default function SearchPage() {
  const { user } = useAuthStore();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"posts" | "topics" | "chats" | "users">("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [topics, setTopics] = useState<PostCategory[]>([]);
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [chatDisplayNames, setChatDisplayNames] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [togglingSavePostId, setTogglingSavePostId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    refreshSavedPostIds().then(setSavedPostIds);
  }, [user]);

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

  return (
    <div className="space-y-4">
      <div className="codex-page-header">
        <h1 className="codex-page-title">Search</h1>
      </div>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Search posts, topics, chats, or users..."
          className="codex-input flex-1 rounded-lg px-4 py-2"
        />
        <button
          onClick={search}
          disabled={loading || !query.trim()}
          className="codex-btn-accent rounded-lg px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(["posts", "topics", "chats", "users"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1 text-sm capitalize ${
              tab === t ? "codex-chip-active" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "posts" && (
        <div className="space-y-3">
          {posts.length === 0 ? (
            <p className="text-slate-400">No matching posts.</p>
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
        <div className="space-y-2">
          {topics.length === 0 ? (
            <p className="text-slate-400">No matching topics.</p>
          ) : (
            topics.map((t) => (
              <Link
                key={`${t.id}-${t.name}`}
                href={`/feed?category=${encodeURIComponent(t.name)}`}
                className="codex-surface codex-surface-hover block rounded-lg p-3"
              >
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-slate-400">View posts in this topic</p>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === "chats" && (
        <div className="space-y-2">
          {chats.length === 0 ? (
            <p className="text-slate-400">No matching chats.</p>
          ) : (
            chats.map((c) => (
              <Link
                key={c.id}
                href={`/chat/${c.id}`}
                className="codex-surface codex-surface-hover block rounded-lg p-3"
              >
                {user?.uid
                  ? chatRoomDisplayTitle(c, user.uid, chatDisplayNames)
                  : c.title}
              </Link>
            ))
          )}
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-2">
          {users.length === 0 ? (
            <p className="text-slate-400">No matching users.</p>
          ) : (
            users.map((u) => (
              <Link
                key={u.uid}
                href={`/user/${u.uid}`}
                className="codex-surface codex-surface-hover flex items-center gap-3 rounded-lg p-3"
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