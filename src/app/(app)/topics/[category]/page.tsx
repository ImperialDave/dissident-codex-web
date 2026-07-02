"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { mapFirestoreError, sanitizeUserError } from "@/lib/utils";
import { ensureTopicChatRoom } from "@/services/categoryService";
import {
  getPosts,
  refreshSavedPostIds,
  togglePostFeedVisibility,
  toggleSavePost,
} from "@/services/postService";
import { useAuthStore } from "@/stores/authStore";
import type { Post } from "@/models";

export default function TopicPostsPage() {
  const { category: categoryParam } = useParams<{ category: string }>();
  const router = useRouter();
  const { user, isModerator } = useAuthStore();
  const category = useMemo(
    () => decodeURIComponent(categoryParam ?? "").trim(),
    [categoryParam]
  );

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingChat, setOpeningChat] = useState(false);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [togglingSavePostId, setTogglingSavePostId] = useState<string | null>(null);
  const [togglingVisibilityPostId, setTogglingVisibilityPostId] = useState<string | null>(null);
  const modView = isModerator();

  const load = useCallback(async () => {
    if (!category) {
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setPosts(await getPosts(category, 50, { includeHidden: modView }));
    } catch (err) {
      setPosts([]);
      setError(sanitizeUserError(err, "Failed to load posts"));
    } finally {
      setLoading(false);
    }
  }, [category, modView]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    refreshSavedPostIds().then(setSavedPostIds);
  }, [user]);

  async function handleOpenChat() {
    if (!category) return;
    setOpeningChat(true);
    setError("");
    try {
      const room = await ensureTopicChatRoom(category);
      router.push(`/chat/${room.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? mapFirestoreError(err.message) : "Failed to open topic chat"
      );
    } finally {
      setOpeningChat(false);
    }
  }

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

  async function handleToggleFeedVisibility(postId: string) {
    setTogglingVisibilityPostId(postId);
    setError("");
    try {
      const hidden = await togglePostFeedVisibility(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, hiddenFromFeed: hidden } : p))
      );
    } catch (err) {
      setError(err instanceof Error ? mapFirestoreError(err.message) : "Failed to update post");
    } finally {
      setTogglingVisibilityPostId(null);
    }
  }

  if (!category) {
    return (
      <div>
        <PageHeader title="Topic" backHref="/topics" />
        <p className="px-4 py-12 text-center codex-text-muted">Topic not found.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={category}
        backHref="/topics"
        actions={
          <button
            type="button"
            onClick={() => void handleOpenChat()}
            disabled={openingChat}
            className="codex-btn-ghost inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm disabled:opacity-50"
          >
            <MessageCircle className="h-4 w-4" />
            {openingChat ? "Opening..." : "Open chat"}
          </button>
        }
      />

      {error && (
        <p className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="px-4 py-12 text-center codex-text-muted">Loading posts...</p>
      ) : posts.length === 0 ? (
        <p className="px-4 py-12 text-center codex-text-muted">No posts in {category} yet.</p>
      ) : (
        <div>
          <p className="border-b border-[var(--color-border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide codex-text-muted">
            Recent posts ({posts.length})
          </p>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canModerate={modView}
              togglingVisibility={togglingVisibilityPostId === post.id}
              onToggleFeedVisibility={modView ? handleToggleFeedVisibility : undefined}
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