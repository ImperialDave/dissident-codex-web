"use client";

import clsx from "clsx";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { AccountMenu } from "@/components/AccountMenu";

interface PageHeaderProps {
  title: string;
  backHref?: string;
  actions?: ReactNode;
  sticky?: boolean;
  className?: string;
  showAccountMenu?: boolean;
  /** When true, avatar menu shows on desktop too (e.g. profile page). */
  accountMenuAlways?: boolean;
}

export function PageHeader({
  title,
  backHref,
  actions,
  sticky = true,
  className,
  showAccountMenu = true,
  accountMenuAlways = false,
}: PageHeaderProps) {
  return (
    <header
      className={clsx(
        "codex-sticky-header flex items-center justify-between gap-3 px-4 py-3",
        sticky && "sticky top-0 z-10",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="codex-btn-icon shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        <h1 className="truncate text-xl font-bold text-[var(--color-on-surface)]">
          {title}
        </h1>
      </div>
      {(actions || showAccountMenu) && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {showAccountMenu && (
            <AccountMenu
              className={accountMenuAlways ? undefined : "xl:hidden"}
            />
          )}
        </div>
      )}
    </header>
  );
}