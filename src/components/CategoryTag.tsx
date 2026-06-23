import Link from "next/link";

interface CategoryTagProps {
  category: string;
  className?: string;
}

export function CategoryTag({ category, className = "" }: CategoryTagProps) {
  return (
    <Link
      href={`/feed?category=${encodeURIComponent(category)}`}
      className={`codex-chip-active rounded-full px-2 py-1 text-xs hover:opacity-90 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {category}
    </Link>
  );
}