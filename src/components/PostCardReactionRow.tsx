"use client";

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
}: PostCardReactionRowProps) {
  return (
    <div
      className="flex items-center"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <ReactionsBlock
        target={{ type: "post", postId }}
        initialSummary={initialSummary}
        compact
        showTrigger
      />
    </div>
  );
}