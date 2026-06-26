import Link from "next/link";
import type { Post } from "@/models";
import { BookmarkButton } from "./BookmarkButton";
import { PostFeedVisibilityToggle } from "./PostFeedVisibilityToggle";
import { PostMedia } from "./PostMedia";
import { RoleBadge } from "./RoleBadge";
import { UserAvatar } from "./UserAvatar";
import { timeAgo } from "@/lib/utils";
import { CategoryTag } from "./CategoryTag";

interface PostCardProps {
  post: Post;
  canModerate?: boolean;
  togglingVisibility?: boolean;
  onToggleFeedVisibility?: (postId: string) => void | Promise<void>;
  saved?: boolean;
  togglingSave?: boolean;
  onToggleSave?: (postId: string) => void | Promise<void>;
  priorityLabel?: string;
}

export function PostCard({
  post,
  canModerate = false,
  togglingVisibility = false,
  onToggleFeedVisibility,
  saved = false,
  togglingSave = false,
  onToggleSave,
  priorityLabel,
}: PostCardProps) {
  const hidden = Boolean(post.hiddenFromFeed);

  return (
    <article
      className={`codex-surface rounded-xl p-4 transition ${
        hidden ? "border-orange-400/40 bg-orange-500/5" : "codex-surface-hover"
      }`}
    >
      <div className="mb-2 flex items-center gap-3">
        <UserAvatar
          name={post.authorName}
          photoUrl={post.authorPhotoUrl}
          size="sm"
          userId={post.authorId}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/user/${post.authorId}`}
              className="font-medium text-white hover:text-[var(--color-accent)]"
            >
              {post.authorName}
            </Link>
            <RoleBadge role={post.authorRole} />
            {priorityLabel && (
              <span className="rounded-full bg-[var(--color-accent)]/20 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
                ★ {priorityLabel}
              </span>
            )}
            {hidden && (
              <span className="rounded-full bg-orange-500/25 px-2 py-0.5 text-[10px] font-medium text-orange-100">
                Hidden from feed
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">{timeAgo(post.createdAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onToggleSave && (
            <BookmarkButton
              saved={saved}
              disabled={togglingSave}
              size="sm"
              onToggle={() => onToggleSave(post.id)}
            />
          )}
          {canModerate && onToggleFeedVisibility && (
            <PostFeedVisibilityToggle
              hiddenFromFeed={hidden}
              disabled={togglingVisibility}
              compact
              onToggle={() => onToggleFeedVisibility(post.id)}
            />
          )}
          <CategoryTag category={post.category} />
        </div>
      </div>
      <Link href={`/post/${post.id}`} className="block">
        <h3 className="mb-2 text-lg font-semibold text-white">{post.title}</h3>
        <p className="line-clamp-3 text-sm text-slate-300">{post.body}</p>
        <PostMedia url={post.imageUrl} mediaType={post.mediaType} preview />
        <div className="mt-3 flex gap-4 text-xs text-slate-400">
          <span>{post.likeCount} likes</span>
          <span>{post.commentCount} comments</span>
        </div>
      </Link>
    </article>
  );
}
