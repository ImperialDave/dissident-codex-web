"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { mapFirestoreError } from "@/lib/utils";
import { getFeedCategoryNames } from "@/services/categoryService";
import { getPosts } from "@/services/postService";
import type { Post } from "@/models";

export default function FeedPage() {
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cats, data] = await Promise.all([
        getFeedCategoryNames(),
        getPosts(category === "All" ? null : category),
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
  }, [category, search]);

  useEffect(() => {
    const fromUrl = searchParams.get("category");
    if (fromUrl?.trim()) setCategory(fromUrl.trim());
  }, [searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">Feed</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts..."
            className="rounded-lg border border-white/10 bg-black/20 px-4 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <Link
            href="/create"
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-center text-sm font-semibold text-black"
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
                ? "bg-[var(--color-accent)] text-black"
                : "border border-white/10 text-slate-300"
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
        <div className="rounded-xl border border-white/10 bg-[var(--color-surface)] p-6 text-center">
          <p className="text-slate-400">No posts yet. Be the first to create one!</p>
          <Link
            href="/create"
            className="mt-4 inline-block rounded-lg bg-[var(--color-accent)] px-5 py-2 font-semibold text-black"
          >
            Create the first post
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}