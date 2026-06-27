import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

interface ListRowProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  interactive?: boolean;
}

export function ListRow({
  children,
  href,
  onClick,
  className,
  interactive = true,
}: ListRowProps) {
  const classes = clsx(
    "codex-list-row block w-full text-left",
    interactive && "codex-list-row-interactive",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {children}
      </button>
    );
  }

  return <div className={classes}>{children}</div>;
}