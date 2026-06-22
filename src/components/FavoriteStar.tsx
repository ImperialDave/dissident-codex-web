"use client";

interface FavoriteStarProps {
  favorited: boolean;
  onToggle: () => void | Promise<void>;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  label?: string;
}

export function FavoriteStar({
  favorited,
  onToggle,
  disabled = false,
  size = "md",
  className = "",
  label,
}: FavoriteStarProps) {
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
      aria-pressed={favorited}
      aria-label={
        label ?? (favorited ? "Remove from favorites" : "Add to favorites")
      }
      title={favorited ? "Remove from favorites" : "Add to favorites"}
      className={`rounded-lg p-1.5 transition hover:bg-white/5 disabled:opacity-50 ${className}`}
    >
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={
          favorited
            ? "fill-[var(--color-accent)] text-[var(--color-accent)]"
            : "fill-transparent stroke-slate-400 stroke-[1.75]"
        }
      >
        <path d="M12 2.5l2.55 5.17 5.7.83-4.12 4.02.97 5.68L12 15.9l-5.1 2.68.97-5.68-4.12-4.02 5.7-.83L12 2.5z" />
      </svg>
    </button>
  );
}
