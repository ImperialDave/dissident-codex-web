"use client";

import Link from "next/link";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

type Variant = "header" | "pills" | "cards";

const MOD_LINKS = [
  { href: "/mod", label: "Mod Tools", description: "Users, posts, and comments" },
  { href: "/mod/topics", label: "Topic Moderation", description: "Ban, lock, and manage topics" },
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
      <div className="flex flex-wrap gap-2">
        {isFounder() && (
          <Link
            href="/founder"
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm",
              pathname.startsWith("/founder") ? "codex-btn-founder-active" : "codex-btn-founder"
            )}
          >
            Founder Tools
          </Link>
        )}
        {isModerator() && (
          <Link
            href="/mod"
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm",
              pathname === "/mod" ? "codex-btn-mod-active" : "codex-btn-mod"
            )}
          >
            Mod Tools
          </Link>
        )}
        {isModerator() && (
          <Link
            href="/mod/topics"
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm",
              pathname.startsWith("/mod/topics") ? "codex-btn-mod-active" : "codex-btn-mod"
            )}
          >
            Topics
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {isFounder() && (
        <Link
          href="/founder"
          className="codex-surface codex-surface-hover rounded-xl border-amber-400/40 bg-amber-500/12 p-4"
        >
          <p className="font-semibold text-amber-100">Founder Tools</p>
          <p className="mt-1 text-sm codex-text-muted">Full control center and role sync</p>
        </Link>
      )}
      {MOD_LINKS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="codex-surface codex-surface-hover rounded-xl border-blue-400/40 bg-blue-500/12 p-4"
        >
          <p className="font-semibold text-blue-100">{item.label}</p>
          <p className="mt-1 text-sm codex-text-muted">{item.description}</p>
        </Link>
      ))}
    </div>
  );
}