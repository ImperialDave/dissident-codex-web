"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { AppearanceMenu } from "@/components/AppearanceMenu";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { ColorModeToggle } from "@/components/ColorModeToggle";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuthStore } from "@/stores/authStore";
import { useIncomingCallStore } from "@/stores/incomingCallStore";
import { listenNotifications } from "@/services/notificationService";

const MOBILE_NAV = [
  { href: "/feed", label: "Feed", icon: "📰" },
  { href: "/topics", label: "Topics", icon: "🏷️" },
  { href: "/notifications", label: "Alerts", icon: "🔔" },
  { href: "/chess", label: "Chess", icon: "♟️" },
  { href: "/create", label: "Create", icon: "✏️" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

const MOBILE_HEADER_NAV = [
  { href: "/feed", label: "Feed" },
  { href: "/topics", label: "Topics" },
  { href: "/friends", label: "Friends" },
  { href: "/notifications", label: "Alerts" },
  { href: "/chess", label: "Chess" },
  { href: "/search", label: "Search" },
  { href: "/chats", label: "Chats" },
];

const DESKTOP_NAV = [
  { href: "/feed", label: "Feed" },
  { href: "/topics", label: "Topics" },
  { href: "/friends", label: "Friends" },
  { href: "/chess", label: "Chess" },
  { href: "/search", label: "Search" },
  { href: "/chats", label: "Chats" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/create", label: "Create" },
  { href: "/notifications", label: "Alerts" },
  { href: "/profile", label: "Profile" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, isModerator, isFounder } = useAuthStore();
  const incomingSession = useIncomingCallStore((s) => s.session);
  const expandIncomingCall = useIncomingCallStore((s) => s.expand);
  const [unread, setUnread] = useState(0);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!accountMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountMenuOpen]);

  if (loading) {
    return (
      <div className="codex-bg flex min-h-screen items-center justify-center text-slate-300">
        <span className="codex-logo text-lg">Loading Codex...</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="codex-bg min-h-screen text-slate-100">
      <header className="codex-header sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/feed" className="codex-logo shrink-0 text-xl font-bold">
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
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {incomingSession && (
              <button
                type="button"
                onClick={expandIncomingCall}
                className="animate-pulse rounded-full border border-emerald-500/50 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30"
              >
                📞 Incoming
              </button>
            )}
            <ColorModeToggle variant="compact" />
            <AppearanceMenu />
            <div className="relative" ref={accountMenuRef}>
            <button
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="codex-surface flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5"
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
            >
              <UserAvatar name={user.displayName} photoUrl={user.photoUrl} size="sm" />
              <span className="hidden max-w-[8rem] truncate sm:inline">{user.displayName}</span>
              <span className="text-slate-400">▾</span>
            </button>
            {accountMenuOpen && (
              <div
                role="menu"
                className="codex-surface absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl py-1 shadow-xl"
              >
                <div className="border-b border-white/10 px-3 py-2">
                  <p className="truncate text-sm font-medium text-white">{user.displayName}</p>
                  <p className="truncate text-xs text-slate-400">{user.email}</p>
                </div>
                <Link
                  href="/profile"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
                >
                  My profile
                </Link>
                <Link
                  href="/saved"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
                >
                  Saved posts
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    setPasswordDialogOpen(true);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                >
                  Change password
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    logout().then(() => router.replace("/login"));
                  }}
                  className="block w-full border-t border-white/10 px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10"
                >
                  Log out
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto border-t border-[var(--color-border)] px-4 py-2 text-sm lg:hidden">
          {MOBILE_HEADER_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative whitespace-nowrap rounded-full px-3 py-1",
                pathname.startsWith(item.href)
                  ? "codex-chip-active"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {item.label}
              {item.href === "/notifications" && unread > 0 ? ` (${unread})` : ""}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 lg:pb-6">{children}</main>

      {incomingSession && (
        <button
          type="button"
          onClick={expandIncomingCall}
          className="fixed bottom-16 left-1/2 z-30 -translate-x-1/2 animate-pulse rounded-full border border-emerald-500/50 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 lg:hidden"
        >
          📞 Incoming call
        </button>
      )}

      <nav className="codex-nav-bar fixed bottom-0 left-0 right-0 z-20 lg:hidden">
        <div className="mx-auto flex max-w-6xl justify-around py-2">
          {MOBILE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative flex min-w-0 flex-1 flex-col items-center px-1 py-1 text-xs",
                pathname.startsWith(item.href)
                  ? "text-[var(--color-accent)] drop-shadow-[0_0_8px_var(--color-accent)]"
                  : "text-slate-400"
              )}
            >
              <span className="relative text-lg">
                {item.icon}
                {item.href === "/notifications" && unread > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-bold leading-none text-black">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
      />
    </div>
  );
}
