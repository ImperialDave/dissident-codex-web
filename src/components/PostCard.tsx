import Link from "next/link";
import type { Post } from "@/models";
import { PostFeedVisibilityToggle } from "./PostFeedVisibilityToggle";
import { PostMedia } from "./PostMedia";
import { RoleBadge } from "./RoleBadge";
import { UserAvatar } from "./UserAvatar";
import { timeAgo } from "@/lib/utils";

interface PostCardProps {
  post: Post;
  canModerate?: boolean;
  togglingVisibility?: boolean;
  onToggleFeedVisibility?: (postId: string) => void | Promise<void>;
}

export function PostCard({
  post,
  canModerate = false,
  togglingVisibility = false,
  onToggleFeedVisibility,
}: PostCardProps) {
  const hidden = Boolean(post.hiddenFromFeed);

  return (
    <article
      className={`rounded-xl border bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent)]/50 ${
        hidden
          ? "border-orange-400/30 opacity-80"
          : "border-white/10"
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
            {hidden && (
              <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-medium text-orange-200">
                Hidden from feed
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">{timeAgo(post.createdAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canModerate && onToggleFeedVisibility && (
            <PostFeedVisibilityToggle
              hiddenFromFeed={hidden}
              disabled={togglingVisibility}
              compact
              onToggle={() => onToggleFeedVisibility(post.id)}
            />
          )}
          <span className="rounded-full bg-[var(--color-accent)]/15 px-2 py-1 text-xs text-[var(--color-accent)]">
            {post.category}
          </span>
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
