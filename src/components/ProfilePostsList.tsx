"use client";

import { PostCard } from "@/components/PostCard";
import type { Post } from "@/models";

interface ProfilePostsListProps {
  posts: Post[];
  loading?: boolean;
  title?: string;
  emptyMessage?: string;
  canModerate?: boolean;
  savedPostIds?: Set<string>;
  togglingSavePostId?: string | null;
  onToggleSave?: (postId: string) => void | Promise<void>;
  togglingVisibilityPostId?: string | null;
  onToggleFeedVisibility?: (postId: string) => void | Promise<void>;
}

export function ProfilePostsList({
  posts,
  loading = false,
  title = "Posts",
  emptyMessage = "No posts yet.",
  canModerate = false,
  savedPostIds,
  togglingSavePostId,
  onToggleSave,
  togglingVisibilityPostId,
  onToggleFeedVisibility,
}: ProfilePostsListProps) {
  return (
    <section>
      <p className="border-b border-[var(--color-border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide codex-text-muted">
        {title} ({loading ? "…" : posts.length})
      </p>
      {loading ? (
        <p className="px-4 py-8 text-center codex-text-muted">Loading posts...</p>
      ) : posts.length === 0 ? (
        <p className="px-4 py-8 text-center codex-text-muted">{emptyMessage}</p>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canModerate={canModerate}
              togglingVisibility={togglingVisibilityPostId === post.id}
              onToggleFeedVisibility={canModerate ? onToggleFeedVisibility : undefined}
              saved={savedPostIds?.has(post.id)}
              togglingSave={togglingSavePostId === post.id}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      )}
    </section>
  );
}