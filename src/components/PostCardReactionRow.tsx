"use client";

import Link from "next/link";
import { ReactionsBlock } from "./ReactionsBlock";
import type { ReactionSummary } from "@/services/reactionService";

interface PostCardReactionRowProps {
  postId: string;
  initialSummary?: ReactionSummary;
  commentCount: number;
}

export function PostCardReactionRow({
  postId,
  initialSummary,
  commentCount,
}: PostCardReactionRowProps) {
  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <ReactionsBlock
        target={{ type: "post", postId }}
        initialSummary={initialSummary}
        compact
        showTrigger
      />
      <Link
        href={`/post/${postId}`}
        className="text-slate-400 transition hover:text-[var(--color-accent)]"
      >
        {commentCount} comments
      </Link>
    </div>
  );
}