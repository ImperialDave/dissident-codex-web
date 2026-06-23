"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { AppearanceMenu } from "@/components/AppearanceMenu";
import { ModerationMenu } from "@/components/ModerationMenu";
import { useAuthStore } from "@/stores/authStore";
import { listenNotifications } from "@/services/notificationService";

/** Primary mobile tabs — fixed bottom bar only */
const MOBILE_PRIMARY_NAV = [
  { href: "/feed", label: "Feed", icon: "📰" },
  { href: "/chats", label: "Chats", icon: "💬" },
  { href: "/chess", label: "Chess", icon: "♟️" },
  { href: "/create", label: "Create", icon: "✏️" },
  { href: "/profile", label: "Profile", icon: "👤" },
] as const;

/** Secondary mobile links — top strip only (no overlap with bottom bar) */
const MOBILE_SECONDARY_NAV = [
  { href: "/friends", label: "Friends" },
  { href: "/search", label: "Search" },
  { href: "/topics", label: "Topics" },
  { href: "/leaderboard", label: "Ranks" },
  { href: "/notifications", label: "Alerts", showBadge: true },
] as const;

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
] as const;

function navActive(pathname: string, href: string): boolean {
  if (href === "/feed") return pathname === "/feed" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, isModerator, isFounder } = useAuthStore();
  const [unread, setUnread] = useState(0);

  const showMod = isModerator();
  const showFounder = isFounder();

  const mobileSecondaryNav = useMemo(() => {
    const staff: { href: string; label: string; tone?: "mod" | "founder" }[] = [];
    if (showMod) staff.push({ href: "/mod", label: "Mod", tone: "mod" });
    if (showFounder) staff.push({ href: "/founder", label: "Founder", tone: "founder" });
    return [...MOBILE_SECONDARY_NAV, ...staff];
  }, [showMod, showFounder]);

  useEffect(() => {
    if (!user) return;
    const unsub = listenNotifications(
      (notifs) => setUnread(notifs.filter((n) => !n.read).length),
      () => setUnread(0)
    );
    return () => unsub?.();
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="codex-bg flex min-h-screen items-center justify-center codex-text-muted">
        <span className="codex-logo text-lg">Loading Codex...</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="codex-bg min-h-screen">
      <header className="codex-header sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/feed" className="codex-logo shrink-0 text-xl font-bold">
            Codex
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden flex-1 flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm lg:flex">
            {DESKTOP_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "text-[var(--color-on-surface)] hover:text-[var(--color-accent)]",
                  navActive(pathname, item.href) && "text-[var(--color-accent)]"
                )}
              >
                {item.label}
                {item.href === "/notifications" && unread > 0 ? ` (${unread})` : ""}
              </Link>
            ))}
            <ModerationMenu variant="header" />
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <AppearanceMenu />
            <Link
              href="/notifications"
              className={clsx(
                "relative rounded-lg p-2 text-lg lg:hidden",
                navActive(pathname, "/notifications")
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                  : "codex-text-muted hover:bg-white/5 hover:text-[var(--color-on-surface)]"
              )}
              aria-label="Notifications"
            >
              🔔
              {unread > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-bold text-black">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <button
              onClick={() => logout().then(() => router.replace("/login"))}
              className="codex-btn-ghost shrink-0 rounded-lg px-3 py-1.5 text-sm"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Mobile secondary nav — items not in the bottom tab bar */}
        <nav className="border-t border-[var(--color-border)] bg-black/20 lg:hidden">
          <div className="mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-4 py-2">
            {mobileSecondaryNav.map((item) => {
              const active = navActive(pathname, item.href);
              const tone = "tone" in item ? item.tone : undefined;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition",
                    active
                      ? tone === "mod"
                        ? "codex-btn-mod-active rounded-full"
                        : tone === "founder"
                          ? "codex-btn-founder-active rounded-full"
                          : "bg-[var(--color-accent)]/20 text-[var(--color-accent)]"
                      : tone === "mod"
                        ? "codex-btn-mod rounded-full"
                        : tone === "founder"
                          ? "codex-btn-founder rounded-full"
                          : "codex-text-muted hover:bg-white/5 hover:text-[var(--color-on-surface)]"
                  )}
                >
                  {item.label}
                  {"showBadge" in item && item.showBadge && unread > 0 && (
                    <span className="rounded-full bg-[var(--color-accent)] px-1.5 text-[10px] font-bold text-black">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-[4.75rem] lg:pb-6">{children}</main>

      {/* Mobile primary tab bar */}
      <nav className="codex-nav-bar fixed bottom-0 left-0 right-0 z-20 lg:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-5 px-1 py-1.5">
          {MOBILE_PRIMARY_NAV.map((item) => {
            const active = navActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition",
                  active
                    ? "text-[var(--color-accent)] drop-shadow-[0_0_8px_var(--color-accent)]"
                    : "codex-text-muted hover:text-[var(--color-on-surface)]"
                )}
              >
                <span
                  className={clsx(
                    "text-xl leading-none",
                    active && "drop-shadow-[0_0_8px_var(--color-accent)]"
                  )}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {active && (
                  <span className="h-0.5 w-4 rounded-full bg-[var(--color-accent)]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}