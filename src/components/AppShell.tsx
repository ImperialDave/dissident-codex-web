"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { useAuthStore } from "@/stores/authStore";
import { listenNotifications } from "@/services/notificationService";

const NAV = [
  { href: "/feed", label: "Feed", icon: "📰" },
  { href: "/chats", label: "Chats", icon: "💬" },
  { href: "/create", label: "Create", icon: "✏️" },
  { href: "/notifications", label: "Alerts", icon: "🔔" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

const EXTRA = [
  { href: "/search", label: "Search" },
  { href: "/topics", label: "Topics" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/friends", label: "Friends" },
  { href: "/chess", label: "Chess" },
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/feed" className="text-xl font-bold text-[var(--color-accent)]">
            Codex
          </Link>
          <nav className="hidden gap-4 text-sm md:flex">
            {EXTRA.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "hover:text-[var(--color-accent)]",
                  pathname.startsWith(item.href) && "text-[var(--color-accent)]"
                )}
              >
                {item.label}
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
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[var(--color-surface)] md:hidden">
        <div className="mx-auto flex max-w-6xl justify-around py-2">
          {NAV.map((item) => (
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
              {item.href === "/notifications" && unread > 0 && (
                <span className="absolute right-0 top-0 rounded-full bg-red-500 px-1.5 text-[10px] text-white">
                  {unread}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}