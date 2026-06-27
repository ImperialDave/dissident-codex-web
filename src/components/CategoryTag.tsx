import Link from "next/link";
import clsx from "clsx";

interface CategoryTagProps {
  category: string;
  className?: string;
  variant?: "chip" | "inline";
}

export function CategoryTag({
  category,
  className = "",
  variant = "chip",
}: CategoryTagProps) {
  if (variant === "inline") {
    return (
      <Link
        href={`/feed?category=${encodeURIComponent(category)}`}
        className={clsx(
          "text-sm text-[var(--color-accent)] hover:underline",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        #{category.replace(/\s+/g, "")}
      </Link>
    );
  }

  return (
    <Link
      href={`/feed?category=${encodeURIComponent(category)}`}
      className={clsx(
        "codex-chip-active rounded-full px-2 py-1 text-xs hover:opacity-90",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {category}
    </Link>
  );
}