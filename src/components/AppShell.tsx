"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { useAuthStore } from "@/stores/authStore";
import { listenNotifications } from "@/services/notificationService";

const MOBILE_NAV = [
  { href: "/feed", label: "Feed", icon: "📰" },
  { href: "/chats", label: "Chats", icon: "💬" },
  { href: "/chess", label: "Chess", icon: "♟️" },
  { href: "/create", label: "Create", icon: "✏️" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

const DESKTOP_NAV = [
  { href: "/feed", label: "Feed" },
  { href: "/chats", label: "Chats" },
  { href: "/friends", label: "Friends" },
  { href: "/chess", label: "Chess" },
  { href: "/search", label: "Search" },
  { href: "/topics", label: "Topics" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/create", label: "Create" },
  { href: "/notifications", label: "Alerts" },
  { href: "/profile", label: "Profile" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, isModerator, isFounder } = useAuthStore();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsub = listenNotifications(
      (notifs) => {
        setUnread(notifs.filter((n) => !n.read).length);
      },
      () => {
        setUnread(0);
      }
    );
    return () => unsub?.();
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-primary)] text-slate-300">
        Loading Codex...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--color-primary)] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[var(--color-primary)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/feed" className="shrink-0 text-xl font-bold text-[var(--color-accent)]">
            Codex
          </Link>
          <nav className="hidden flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm lg:flex">
            {DESKTOP_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "hover:text-[var(--color-accent)]",
                  pathname.startsWith(item.href) && "text-[var(--color-accent)]"
                )}
              >
                {item.label}
                {item.href === "/notifications" && unread > 0 ? ` (${unread})` : ""}
              </Link>
            ))}
            {isModerator() && (
              <Link href="/mod" className="text-blue-300 hover:text-blue-200">
                Mod Tools
              </Link>
            )}
            {isFounder() && (
              <Link href="/founder" className="text-amber-300 hover:text-amber-200">
                Founder
              </Link>
            )}
          </nav>
          <button
            onClick={() => logout().then(() => router.replace("/login"))}
            className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5"
          >
            Log out
          </button>
        </div>
        <nav className="flex gap-2 overflow-x-auto border-t border-white/5 px-4 py-2 text-sm lg:hidden">
          {DESKTOP_NAV.slice(0, 6).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "whitespace-nowrap rounded-full px-3 py-1",
                pathname.startsWith(item.href)
                  ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)]"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 lg:pb-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[var(--color-surface)] lg:hidden">
        <div className="mx-auto flex max-w-6xl justify-around py-2">
          {MOBILE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative flex flex-col items-center px-2 py-1 text-xs",
                pathname.startsWith(item.href) ? "text-[var(--color-accent)]" : "text-slate-400"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}