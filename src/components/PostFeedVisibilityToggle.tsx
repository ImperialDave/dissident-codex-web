"use client";

interface PostFeedVisibilityToggleProps {
  hiddenFromFeed?: boolean;
  disabled?: boolean;
  onToggle: () => void | Promise<void>;
  compact?: boolean;
}

export function PostFeedVisibilityToggle({
  hiddenFromFeed = false,
  disabled = false,
  onToggle,
  compact = false,
}: PostFeedVisibilityToggleProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void onToggle();
      }}
      disabled={disabled}
      aria-pressed={hiddenFromFeed}
      title={hiddenFromFeed ? "Unhide from feed" : "Hide from feed"}
      className={`rounded-lg border transition disabled:opacity-50 ${
        compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
      } ${
        hiddenFromFeed
          ? "border-orange-400/40 bg-orange-500/15 text-orange-200 hover:bg-orange-500/25"
          : "border-white/15 text-slate-300 hover:bg-white/5"
      }`}
    >
      {hiddenFromFeed ? "Unhide" : "Hide"}
    </button>
  );
}
