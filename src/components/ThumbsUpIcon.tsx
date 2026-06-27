import clsx from "clsx";

interface ThumbsUpIconProps {
  filled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const SIZES = { sm: 16, md: 20 } as const;

export function ThumbsUpIcon({ filled = false, size = "md", className }: ThumbsUpIconProps) {
  const px = SIZES[size];

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx(
        "shrink-0 transition-colors duration-150",
        filled ? "text-[var(--color-accent)]" : "text-slate-400",
        className
      )}
      aria-hidden
    >
      {filled ? (
        <path
          d="M7 22V11H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3.5l2.8-5.6A2 2 0 0 1 12.2 0h.3a2 2 0 0 1 2 2v5h5.5a3 3 0 0 1 2.9 3.8l-1.8 7.2A3 3 0 0 1 18.2 22H7Z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M7 22V11H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3.5l2.8-5.6A2 2 0 0 1 12.2 0h.3a2 2 0 0 1 2 2v5h5.5a3 3 0 0 1 2.9 3.8l-1.8 7.2A3 3 0 0 1 18.2 22H7Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}