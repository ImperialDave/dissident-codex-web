"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle, MoreHorizontal } from "lucide-react";
import type { Post } from "@/models";
import { RichPostText } from "@/components/bible/RichPostText";
import { BookmarkButton } from "./BookmarkButton";
import { PostFeedVisibilityToggle } from "./PostFeedVisibilityToggle";
import { PostMedia } from "./PostMedia";
import { RoleBadge } from "./RoleBadge";
import { UserAvatar } from "./UserAvatar";
import { timeAgo } from "@/lib/utils";
import { CategoryTag } from "./CategoryTag";
import { PostCardReactionRow } from "./PostCardReactionRow";
import { DropdownItem, DropdownMenu } from "./ui/DropdownMenu";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const hasMenu = Boolean(onToggleSave || (canModerate && onToggleFeedVisibility));

  return (
    <article
      className={`codex-timeline-row ${hidden ? "bg-orange-500/5" : ""}`}
    >
      <div className="flex gap-3">
        <Link href={`/user/${post.authorId}`} className="shrink-0">
          <UserAvatar
            name={post.authorName}
            photoUrl={post.authorPhotoUrl}
            size="sm"
            userId={post.authorId}
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[15px] leading-snug">
              <Link
                href={`/user/${post.authorId}`}
                className="truncate font-bold hover:underline"
              >
                {post.authorName}
              </Link>
              <RoleBadge role={post.authorRole} compact />
              <span className="codex-text-muted">·</span>
              <span className="codex-text-muted text-sm">{timeAgo(post.createdAt)}</span>
              {priorityLabel && (
                <>
                  <span className="codex-text-muted">·</span>
                  <span className="text-xs font-medium text-[var(--color-accent)]">
                    {priorityLabel}
                  </span>
                </>
              )}
              {hidden && (
                <>
                  <span className="codex-text-muted">·</span>
                  <span className="text-xs text-orange-300">Hidden</span>
                </>
              )}
            </div>

            {hasMenu && (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="codex-btn-icon -mr-1"
                  aria-label="Post options"
                >
                  <MoreHorizontal className="h-[18px] w-[18px]" />
                </button>
                <DropdownMenu open={menuOpen} onClose={() => setMenuOpen(false)}>
                  {onToggleSave && (
                    <DropdownItem
                      onClick={() => {
                        setMenuOpen(false);
                        void onToggleSave(post.id);
                      }}
                    >
                      {saved ? "Remove bookmark" : "Bookmark post"}
                    </DropdownItem>
                  )}
                  {canModerate && onToggleFeedVisibility && (
                    <DropdownItem
                      onClick={() => {
                        setMenuOpen(false);
                        void onToggleFeedVisibility(post.id);
                      }}
                    >
                      {hidden ? "Show in feed" : "Hide from feed"}
                    </DropdownItem>
                  )}
                </DropdownMenu>
              </div>
            )}
          </div>

          <div className="mt-0.5">
            <CategoryTag category={post.category} variant="inline" />
          </div>

          <Link href={`/post/${post.id}`} className="mt-2 block">
            <h3 className="text-[17px] font-normal leading-snug">{post.title}</h3>
            <p className="mt-1 line-clamp-3 text-[15px] codex-text-muted whitespace-pre-wrap">
              <RichPostText text={post.body} />
            </p>
            <PostMedia url={post.imageUrl} mediaType={post.mediaType} preview />
          </Link>

          <div className="mt-3 flex max-w-md items-center justify-between">
            <PostCardReactionRow
              postId={post.id}
              initialSummary={post.reactionSummary}
              commentCount={post.commentCount}
            />
            <div className="flex items-center gap-1">
              {onToggleSave && (
                <BookmarkButton
                  saved={saved}
                  disabled={togglingSave}
                  size="sm"
                  variant="action"
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
              <Link
                href={`/post/${post.id}`}
                className="codex-post-action"
                aria-label={`${post.commentCount} comments`}
              >
                <MessageCircle className="h-[18px] w-[18px]" />
                <span>{post.commentCount || ""}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}