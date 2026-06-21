"use client";

import Link from "next/link";
import { useState } from "react";
import { PostCard } from "@/components/PostCard";
import { mapFirestoreError } from "@/lib/utils";
import { searchTopics } from "@/services/categoryService";
import { searchPosts } from "@/services/postService";
import { getChatRoomsForInbox, searchChatRooms } from "@/services/chatService";
import type { ChatRoom, Post, PostCategory } from "@/models";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"posts" | "topics" | "chats">("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [topics, setTopics] = useState<PostCategory[]>([]);
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search() {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError("");
    setPosts([]);
    setTopics([]);
    setChats([]);

    const [postsResult, topicsResult, chatsResult] = await Promise.allSettled([
      searchPosts(q),
      searchTopics(q),
      getChatRoomsForInbox().then((rooms) => searchChatRooms(q, rooms)),
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
      setChats(chatsResult.value);
    } else {
      errors.push(`Chats: ${formatError(chatsResult.reason)}`);
    }

    if (errors.length === 3) {
      setError(errors.join(" · "));
    } else if (errors.length > 0) {
      setError(errors.join(" · "));
    }

    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Search</h1>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Search posts, topics, or chats..."
          className="flex-1 rounded-lg border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-[var(--color-accent)]"
        />
        <button
          onClick={search}
          disabled={loading || !query.trim()}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 font-semibold text-black disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {(["posts", "topics", "chats"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1 text-sm capitalize ${
              tab === t ? "bg-[var(--color-accent)] text-black" : "border border-white/15"
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
            posts.map((p) => <PostCard key={p.id} post={p} />)
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
                className="block rounded-lg border border-white/10 bg-[var(--color-surface)] p-3 hover:border-[var(--color-accent)]/40"
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
                className="block rounded-lg border border-white/10 bg-[var(--color-surface)] p-3 hover:border-[var(--color-accent)]/40"
              >
                {c.title}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}