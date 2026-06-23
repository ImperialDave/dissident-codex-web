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
      className={`rounded-lg border font-medium transition ${
        compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
      } ${
        hiddenFromFeed
          ? "border-orange-400/50 bg-orange-500/20 text-orange-100 hover:bg-orange-500/30"
          : "codex-btn-ghost"
      }`}
    >
      {hiddenFromFeed ? "Unhide from feed" : "Hide from feed"}
    </button>
  );
}
