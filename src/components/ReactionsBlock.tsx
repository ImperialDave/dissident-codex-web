"use client";

import { useCallback, useEffect, useState } from "react";
import { EmojiPickerModal } from "./EmojiPickerModal";
import { ReactionPicker } from "./ReactionPicker";
import { ReactionPills } from "./ReactionPills";
import { resolveQuickEmojis } from "@/lib/emoji";
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
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
        setPickerOpen(false);
        setFullOpen(false);
      }
    },
    [target]
  );

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <ReactionPills
          summary={summary}
          mine={mine}
          onToggle={handleToggle}
          disabled={busy}
          compact={compact}
        />
        {showTrigger && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setPickerOpen((open) => !open)}
            className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-400 transition hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] disabled:opacity-50"
            aria-label="Add reaction"
          >
            React
          </button>
        )}
      </div>

      {pickerOpen && (
        <div className="absolute bottom-full left-0 z-20 mb-2 animate-in fade-in">
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

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

      <EmojiPickerModal
        open={fullOpen}
        onClose={() => setFullOpen(false)}
        onSelect={handleToggle}
      />
    </div>
  );
}
