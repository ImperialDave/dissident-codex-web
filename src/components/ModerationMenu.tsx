"use client";

import Link from "next/link";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

type Variant = "header" | "pills" | "cards";

const MOD_LINKS = [
  {
    href: "/mod",
    label: "Mod Tools",
    short: "Users & posts",
    description: "Manage roles, posts, and comments",
    icon: "🛡️",
  },
  {
    href: "/mod/topics",
    label: "Topics",
    short: "Ban & lock",
    description: "Ban topic names and lock chat rooms",
    icon: "📋",
  },
] as const;

export function ModerationMenu({ variant = "pills" }: { variant?: Variant }) {
  const pathname = usePathname();
  const { isModerator, isFounder } = useAuthStore();

  if (!isModerator() && !isFounder()) return null;

  if (variant === "header") {
    return (
      <>
        {isModerator() && (
          <Link
            href="/mod"
            className={clsx(
              "codex-link-mod",
              pathname.startsWith("/mod") && "codex-link-mod-active"
            )}
          >
            Mod Tools
          </Link>
        )}
        {isFounder() && (
          <Link
            href="/founder"
            className={clsx(
              "codex-link-founder",
              pathname.startsWith("/founder") && "codex-link-founder-active"
            )}
          >
            Founder
          </Link>
        )}
      </>
    );
  }

  if (variant === "pills") {
    return (
      <nav className="codex-mod-nav" aria-label="Moderation">
        {isFounder() && (
          <Link
            href="/founder"
            className={clsx(
              "codex-mod-nav-item",
              pathname.startsWith("/founder") ? "codex-btn-founder-active" : "codex-btn-founder"
            )}
          >
            Founder
          </Link>
        )}
        {isModerator() && (
          <Link
            href="/mod"
            className={clsx(
              "codex-mod-nav-item",
              pathname === "/mod" ? "codex-btn-mod-active" : "codex-btn-mod"
            )}
          >
            Mod Tools
          </Link>
        )}
        {isModerator() &&
          MOD_LINKS.filter((item) => item.href !== "/mod").map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "codex-mod-nav-item",
                pathname.startsWith(item.href) ? "codex-btn-mod-active" : "codex-btn-mod"
              )}
            >
              {item.label}
            </Link>
          ))}
      </nav>
    );
  }

  return (
    <div className="codex-mod-cards">
      {isFounder() && (
        <Link
          href="/founder"
          className={clsx(
            "codex-mod-card codex-mod-card-founder",
            pathname.startsWith("/founder") && "codex-mod-card-active"
          )}
        >
          <span className="codex-mod-card-icon" aria-hidden>
            👑
          </span>
          <div className="min-w-0 flex-1">
            <p className="codex-mod-card-title">Founder Tools</p>
            <p className="codex-mod-card-desc">Full control center and role sync</p>
          </div>
          <span className="codex-mod-card-arrow" aria-hidden>
            →
          </span>
        </Link>
      )}
      {MOD_LINKS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={clsx(
            "codex-mod-card codex-mod-card-mod",
            pathname.startsWith(item.href) && "codex-mod-card-active"
          )}
        >
          <span className="codex-mod-card-icon" aria-hidden>
            {item.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="codex-mod-card-title">{item.label}</p>
            <p className="codex-mod-card-desc">{item.description}</p>
          </div>
          <span className="codex-mod-card-arrow" aria-hidden>
            →
          </span>
        </Link>
      ))}
    </div>
  );
}