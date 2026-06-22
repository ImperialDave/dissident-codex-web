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
              "hover:text-blue-200",
              pathname.startsWith("/mod") ? "text-blue-200" : "text-blue-300"
            )}
          >
            Mod Tools
          </Link>
        )}
        {isFounder() && (
          <Link
            href="/founder"
            className={clsx(
              "hover:text-amber-200",
              pathname.startsWith("/founder") ? "text-amber-200" : "text-amber-300"
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
              "rounded-full px-3 py-1 text-sm",
              pathname.startsWith("/founder")
                ? "bg-amber-500 text-black"
                : "border border-amber-500/40 text-amber-300"
            )}
          >
            Founder Tools
          </Link>
        )}
        {isModerator() && (
          <Link
            href="/mod"
            className={clsx(
              "rounded-full px-3 py-1 text-sm",
              pathname === "/mod"
                ? "bg-blue-500 text-white"
                : "border border-blue-500/40 text-blue-300"
            )}
          >
            Mod Tools
          </Link>
        )}
        {isModerator() && (
          <Link
            href="/mod/topics"
            className={clsx(
              "rounded-full px-3 py-1 text-sm",
              pathname.startsWith("/mod/topics")
                ? "bg-blue-500 text-white"
                : "border border-blue-500/40 text-blue-300"
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
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 hover:border-amber-400/50"
        >
          <p className="font-semibold text-amber-300">Founder Tools</p>
          <p className="mt-1 text-sm text-slate-400">Full control center and role sync</p>
        </Link>
      )}
      {MOD_LINKS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 hover:border-blue-400/50"
        >
          <p className="font-semibold text-blue-200">{item.label}</p>
          <p className="mt-1 text-sm text-slate-400">{item.description}</p>
        </Link>
      ))}
    </div>
  );
}
