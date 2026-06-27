"use client";

import { useCallback, useEffect, useState } from "react";
import { resolveQuickEmojis, THUMBS_UP_EMOJI } from "@/lib/emoji";
import { ReactionPills } from "./ReactionPills";
import { ReactionTriggerButton } from "./ReactionTriggerButton";
import { getCachedQuickEmojis, loadReactionPrefs } from "@/services/reactionPrefsService";
import {
  toggleReaction,
  type ReactionSummary,
} from "@/services/reactionService";

function applySummaryDelta(
  summary: ReactionSummary,
  emoji: string,
  delta: 1 | -1
): ReactionSummary {
  const next = { ...summary };
  const count = (next[emoji] ?? 0) + delta;
  if (count <= 0) delete next[emoji];
  else next[emoji] = count;
  return next;
}

interface MessageReactionsProps {
  roomId: string;
  messageId: string;
  summary?: ReactionSummary;
  onSummaryChange: (messageId: string, summary: ReactionSummary) => void;
  alignEnd?: boolean;
}

export function MessageReactions({
  roomId,
  messageId,
  summary = {},
  onSummaryChange,
  alignEnd = false,
}: MessageReactionsProps) {
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [quickEmojis, setQuickEmojis] = useState<string[]>(getCachedQuickEmojis);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadReactionPrefs()
      .then((prefs) => setQuickEmojis(resolveQuickEmojis(prefs.recentEmojis, prefs.emojiUsageCounts)))
      .catch(() => {});
  }, []);

  const handleToggle = useCallback(
    async (emoji: string) => {
      setBusy(true);
      try {
        const result = await toggleReaction(
          { type: "message", roomId, messageId },
          emoji
        );
        onSummaryChange(
          messageId,
          applySummaryDelta(summary, result.emoji, result.added ? 1 : -1)
        );
        setMine((prev) => {
          const next = new Set(prev);
          if (result.added) next.add(result.emoji);
          else next.delete(result.emoji);
          return next;
        });
        setQuickEmojis(getCachedQuickEmojis());
      } finally {
        setBusy(false);
      }
    },
    [messageId, onSummaryChange, roomId, summary]
  );

  return (
    <div className={`relative ${alignEnd ? "flex justify-end" : ""}`}>
      <div className={`flex flex-wrap items-center gap-1 ${alignEnd ? "justify-end" : ""}`}>
        <ReactionTriggerButton
          active={mine.has(THUMBS_UP_EMOJI)}
          disabled={busy}
          quickEmojis={quickEmojis}
          onToggle={handleToggle}
          variant="hover"
          pickerAlign={alignEnd ? "end" : "start"}
        />
        <ReactionPills
          summary={summary}
          mine={mine}
          onToggle={handleToggle}
          disabled={busy}
          compact
        />
      </div>
    </div>
  );
}