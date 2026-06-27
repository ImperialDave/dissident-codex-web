"use client";

import clsx from "clsx";
import Link from "next/link";
import type { NavItem } from "@/lib/navigation";
import { isNavActive } from "@/lib/navigation";

interface NavLinkProps {
  item: NavItem;
  pathname: string;
  variant: "sidebar" | "bottom" | "more";
  badge?: number;
  onClick?: () => void;
}

export function NavLink({ item, pathname, variant, badge, onClick }: NavLinkProps) {
  const active = isNavActive(pathname, item.href);
  const Icon = item.icon;

  if (variant === "sidebar") {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={clsx(
          "codex-nav-item codex-nav-item-sidebar",
          active && "codex-nav-item-active"
        )}
      >
        <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
        <span className="text-[19px] leading-none">{item.label}</span>
        {badge != null && badge > 0 && (
          <span className="codex-nav-badge ml-auto">{badge > 9 ? "9+" : badge}</span>
        )}
      </Link>
    );
  }

  if (variant === "bottom") {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={clsx(
          "codex-nav-item codex-nav-item-bottom",
          active && "codex-nav-item-active"
        )}
        aria-label={item.label}
      >
        <span className="relative">
          <Icon className="h-[26px] w-[26px]" strokeWidth={active ? 2.25 : 1.75} />
          {badge != null && badge > 0 && (
            <span className="codex-nav-badge-dot absolute -right-1 -top-1">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={clsx(
        "codex-nav-item codex-nav-item-more",
        active && "codex-nav-item-active"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
      <span>{item.label}</span>
    </Link>
  );
}