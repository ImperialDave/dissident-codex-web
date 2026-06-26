"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { mapFirestoreError } from "@/lib/utils";
import {
  getSavedPosts,
  refreshSavedPostIds,
  toggleSavePost,
} from "@/services/postService";
import type { Post } from "@/models";

export default function SavedPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingSavePostId, setTogglingSavePostId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [savedPosts, ids] = await Promise.all([getSavedPosts(), refreshSavedPostIds()]);
      setPosts(savedPosts);
      setSavedPostIds(ids);
    } catch (err) {
      setPosts([]);
      setSavedPostIds(new Set());
      const message = err instanceof Error ? err.message : "Failed to load saved posts";
      setError(mapFirestoreError(message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      if (!nowSaved) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (err) {
      setError(err instanceof Error ? mapFirestoreError(err.message) : "Failed to update save");
    } finally {
      setTogglingSavePostId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Saved posts</h1>
        <p className="mt-1 text-sm text-slate-400">
          Posts you bookmarked for later.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Loading saved posts...</p>
      ) : posts.length === 0 ? (
        <div className="codex-surface rounded-xl p-6 text-center">
          <p className="text-slate-300">No saved posts yet.</p>
          <p className="mt-2 text-sm text-slate-400">
            Tap the bookmark icon on any post to save it here.
          </p>
          <Link
            href="/feed"
            className="mt-4 inline-block rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black"
          >
            Browse feed
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              saved={savedPostIds.has(post.id)}
              togglingSave={togglingSavePostId === post.id}
              onToggleSave={handleToggleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}