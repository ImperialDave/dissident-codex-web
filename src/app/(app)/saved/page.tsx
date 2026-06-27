"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { PageHeader } from "@/components/ui/PageHeader";
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
    <div>
      <PageHeader title="Saved posts" />

      {error && (
        <p className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="px-4 py-12 text-center codex-text-muted">Loading saved posts...</p>
      ) : posts.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="codex-text-muted">No saved posts yet.</p>
          <p className="mt-2 text-sm codex-text-muted">
            Bookmark any post to save it here.
          </p>
          <Link
            href="/feed"
            className="codex-btn-accent mt-4 inline-block rounded-full px-5 py-2"
          >
            Browse feed
          </Link>
        </div>
      ) : (
        <div>
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