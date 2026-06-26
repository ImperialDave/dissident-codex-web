"use client";

import { useCallback, useEffect, useState } from "react";
import { resolveQuickEmojis } from "@/lib/emoji";
import { EmojiPickerModal } from "./EmojiPickerModal";
import { ReactionPicker } from "./ReactionPicker";
import { ReactionPills } from "./ReactionPills";
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
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
        setPickerOpen(false);
        setFullOpen(false);
      }
    },
    [messageId, onSummaryChange, roomId, summary]
  );

  return (
    <div className={`relative ${alignEnd ? "flex justify-end" : ""}`}>
      <div className={`flex flex-wrap items-center gap-1 ${alignEnd ? "justify-end" : ""}`}>
        <ReactionPills
          summary={summary}
          mine={mine}
          onToggle={handleToggle}
          disabled={busy}
          compact
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => setPickerOpen((open) => !open)}
          className="rounded-full px-1.5 py-0.5 text-[10px] text-slate-500 opacity-0 transition group-hover/reaction:opacity-100 hover:text-[var(--color-accent)] disabled:opacity-50"
          aria-label="Add reaction"
        >
          +
        </button>
      </div>

      {pickerOpen && (
        <div
          className={`absolute bottom-full z-30 mb-1 ${alignEnd ? "right-0" : "left-0"}`}
        >
          <ReactionPicker
            emojis={quickEmojis}
            disabled={busy}
            onPick={handleToggle}
            onOpenFull={() => {
              setPickerOpen(false);
              setFullOpen(true);
            }}
          />
        </div>
      )}

      <EmojiPickerModal
        open={fullOpen}
        onClose={() => setFullOpen(false)}
        onSelect={handleToggle}
      />
    </div>
  );
}
