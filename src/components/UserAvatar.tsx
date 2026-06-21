import clsx from "clsx";

export function UserAvatar({
  name,
  photoUrl,
  size = "md",
}: {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-16 w-16 text-lg" };
  const initial = name?.charAt(0)?.toUpperCase() || "?";

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={clsx("rounded-full object-cover", sizes[size])}
      />
    );
  }

  return (
    <div
      className={clsx(
        "flex items-center justify-center rounded-full bg-[var(--color-accent)]/30 font-semibold text-[var(--color-accent)]",
        sizes[size]
      )}
    >
      {initial}
    </div>
  );
}