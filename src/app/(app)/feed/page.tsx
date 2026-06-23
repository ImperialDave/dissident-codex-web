"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { mapFirestoreError } from "@/lib/utils";
import { getFeedCategoryNames } from "@/services/categoryService";
import { getPosts, togglePostFeedVisibility } from "@/services/postService";
import { useAuthStore } from "@/stores/authStore";
import type { Post } from "@/models";

export default function FeedPage() {
  const searchParams = useSearchParams();
  const { isModerator } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingPostId, setTogglingPostId] = useState<string | null>(null);
  const modView = isModerator();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cats, data] = await Promise.all([
        getFeedCategoryNames(),
        getPosts(category === "All" ? null : category, 50, {
          includeHidden: modView,
        }),
      ]);
      setCategories(cats);
      let filtered = data;
      const q = search.trim().toLowerCase();
      if (q) {
        filtered = data.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.body.toLowerCase().includes(q) ||
            p.authorName.toLowerCase().includes(q)
        );
      }
      setPosts(filtered);
    } catch (err) {
      setPosts([]);
      const message = err instanceof Error ? err.message : "Failed to load feed";
      setError(mapFirestoreError(message));
    } finally {
      setLoading(false);
    }
  }, [category, search, modView]);

  async function handleToggleFeedVisibility(postId: string) {
    setTogglingPostId(postId);
    setError("");
    try {
      const hidden = await togglePostFeedVisibility(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, hiddenFromFeed: hidden } : p))
      );
    } catch (err) {
      setError(err instanceof Error ? mapFirestoreError(err.message) : "Failed to update post");
    } finally {
      setTogglingPostId(null);
    }
  }

  useEffect(() => {
    const fromUrl = searchParams.get("category");
    if (fromUrl?.trim()) setCategory(fromUrl.trim());
  }, [searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="codex-page-header">
        <h1 className="codex-page-title">Feed</h1>
        <div className="codex-page-actions w-full sm:w-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts..."
            className="codex-input min-w-0 flex-1 rounded-lg px-4 py-2 text-sm sm:min-w-[12rem]"
          />
          <Link
            href="/create"
            className="codex-btn-accent shrink-0 rounded-lg px-4 py-2 text-center text-sm"
          >
            Create post
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`rounded-full px-3 py-1 text-sm ${
              category === cat
                ? "codex-chip-active"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading posts...</p>
      ) : posts.length === 0 ? (
        <div className="codex-surface rounded-xl p-6 text-center">
          <p className="text-slate-400">No posts yet. Be the first to create one!</p>
          <Link
            href="/create"
            className="codex-btn-accent mt-4 inline-block rounded-lg px-5 py-2"
          >
            Create the first post
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canModerate={modView}
              togglingVisibility={togglingPostId === post.id}
              onToggleFeedVisibility={modView ? handleToggleFeedVisibility : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
