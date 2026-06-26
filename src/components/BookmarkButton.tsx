"use client";

interface BookmarkButtonProps {
  saved: boolean;
  onToggle: () => void | Promise<void>;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  label?: string;
}

export function BookmarkButton({
  saved,
  onToggle,
  disabled = false,
  size = "md",
  className = "",
  label,
}: BookmarkButtonProps) {
  const dim = size === "sm" ? 18 : 22;

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
      className={`rounded-lg p-1.5 transition hover:bg-white/5 disabled:opacity-50 ${className}`}
    >
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={
          saved
            ? "fill-[var(--color-accent)] text-[var(--color-accent)]"
            : "fill-transparent stroke-slate-400 stroke-[1.75]"
        }
      >
        <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4V4z" />
      </svg>
    </button>
  );
}