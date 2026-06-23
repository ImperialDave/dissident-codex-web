import clsx from "clsx";
import Link from "next/link";

export function UserAvatar({
  name,
  photoUrl,
  size = "md",
  userId,
}: {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  /** When set, avatar links to /user/{userId} */
  userId?: string;
}) {
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-16 w-16 text-lg" };
  const initial = name?.charAt(0)?.toUpperCase() || "?";

  const avatar = photoUrl ? (
    <img
      src={photoUrl}
      alt={name}
      className={clsx("rounded-full object-cover", sizes[size])}
    />
  ) : (
    <div
      className={clsx(
        "flex items-center justify-center rounded-full bg-[var(--color-accent)]/30 font-semibold text-[var(--color-accent)]",
        sizes[size]
      )}
    >
      {initial}
    </div>
  );

  if (!userId) return avatar;

  return (
    <Link
      href={`/user/${userId}`}
      onClick={(e) => e.stopPropagation()}
      className="shrink-0 rounded-full transition hover:ring-2 hover:ring-[var(--color-accent)]/50"
      aria-label={`View ${name}'s profile`}
    >
      {avatar}
    </Link>
  );
}