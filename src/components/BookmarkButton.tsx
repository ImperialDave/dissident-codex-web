"use client";

import { Bookmark } from "lucide-react";
import clsx from "clsx";

interface BookmarkButtonProps {
  saved: boolean;
  onToggle: () => void | Promise<void>;
  disabled?: boolean;
  size?: "sm" | "md";
  variant?: "default" | "action";
  className?: string;
  label?: string;
}

export function BookmarkButton({
  saved,
  onToggle,
  disabled = false,
  size = "md",
  variant = "default",
  className = "",
  label,
}: BookmarkButtonProps) {
  const dim = size === "sm" ? 18 : 22;

  const buttonClass =
    variant === "action"
      ? clsx("codex-post-action", saved && "text-[var(--color-accent)]", className)
      : clsx(
          "rounded-full p-1.5 transition hover:bg-white/5 disabled:opacity-50",
          className
        );

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void onToggle();
      }}
      disabled={disabled}
      aria-pressed={saved}
      aria-label={label ?? (saved ? "Remove from saved posts" : "Save post")}
      title={saved ? "Remove from saved posts" : "Save post"}
      className={buttonClass}
    >
      <Bookmark
        className={clsx(
          saved ? "fill-current text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"
        )}
        style={{ width: dim, height: dim }}
        strokeWidth={saved ? 0 : 1.75}
      />
    </button>
  );
}