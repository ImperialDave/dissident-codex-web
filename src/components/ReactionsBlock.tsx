"use client";

import { useCallback, useEffect, useState } from "react";
import { ReactionPills } from "./ReactionPills";
import { ReactionTriggerButton } from "./ReactionTriggerButton";
import { resolveQuickEmojis, THUMBS_UP_EMOJI } from "@/lib/emoji";
import { loadReactionPrefs, getCachedQuickEmojis } from "@/services/reactionPrefsService";
import {
  listenMyReactions,
  listenReactionSummary,
  toggleReaction,
  type ReactionSummary,
  type ReactionTarget,
} from "@/services/reactionService";

function targetKey(target: ReactionTarget): string {
  switch (target.type) {
    case "post":
      return `post:${target.postId}`;
    case "comment":
      return `comment:${target.commentId}`;
    case "message":
      return `message:${target.roomId}:${target.messageId}`;
  }
}

interface ReactionsBlockProps {
  target: ReactionTarget;
  initialSummary?: ReactionSummary;
  showTrigger?: boolean;
  compact?: boolean;
  className?: string;
}

export function ReactionsBlock({
  target,
  initialSummary,
  showTrigger = true,
  compact = false,
  className = "",
}: ReactionsBlockProps) {
  const [summary, setSummary] = useState<ReactionSummary>(initialSummary ?? {});
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [quickEmojis, setQuickEmojis] = useState<string[]>(getCachedQuickEmojis);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReactionPrefs()
      .then((prefs) => {
        setQuickEmojis(resolveQuickEmojis(prefs.recentEmojis, prefs.emojiUsageCounts));
      })
      .catch(() => {});
  }, []);

  const targetId = targetKey(target);

  useEffect(() => {
    const unsubs = [
      listenReactionSummary(target, setSummary),
      listenMyReactions(target, setMine),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, [targetId]);

  const handleToggle = useCallback(
    async (emoji: string) => {
      setError("");
      setBusy(true);
      try {
        const result = await toggleReaction(target, emoji);
        setMine((prev) => {
          const next = new Set(prev);
          if (result.added) next.add(result.emoji);
          else next.delete(result.emoji);
          return next;
        });
        setQuickEmojis(getCachedQuickEmojis());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Reaction failed");
      } finally {
        setBusy(false);
      }
    },
    [target]
  );

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {showTrigger && (
          <ReactionTriggerButton
            active={mine.has(THUMBS_UP_EMOJI)}
            disabled={busy}
            quickEmojis={quickEmojis}
            onToggle={handleToggle}
            variant={compact ? "compact" : "default"}
          />
        )}
        <ReactionPills
          summary={summary}
          mine={mine}
          onToggle={handleToggle}
          disabled={busy}
          compact={compact}
        />
      </div>

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}