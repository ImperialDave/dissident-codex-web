"use client";

import { sortedReactionEntries } from "@/lib/emoji";

interface ReactionPillsProps {
  summary: Record<string, number> | undefined;
  mine?: Set<string>;
  onToggle?: (emoji: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function ReactionPills({
  summary,
  mine,
  onToggle,
  disabled = false,
  compact = false,
}: ReactionPillsProps) {
  const entries = sortedReactionEntries(summary);
  if (!entries.length && !onToggle) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "" : "mt-2"}`}>
      {entries.map(([emoji, count]) => {
        const active = mine?.has(emoji);
        return (
          <button
            key={emoji}
            type="button"
            disabled={disabled || !onToggle}
            onClick={() => onToggle?.(emoji)}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition ${
              active
                ? "bg-[var(--color-accent)]/20 ring-1 ring-[var(--color-accent)] text-white"
                : "bg-white/5 text-slate-200 hover:bg-white/10"
            } ${!onToggle ? "cursor-default" : ""} disabled:opacity-50`}
            aria-label={`${emoji} ${count}${active ? ", you reacted" : ""}`}
          >
            <span className={compact ? "text-sm" : "text-base"}>{emoji}</span>
            <span className="font-medium tabular-nums">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
