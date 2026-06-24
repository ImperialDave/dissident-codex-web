"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { VoiceIncomingListener } from "@/components/VoiceIncomingListener";
import { UserAvatar } from "@/components/UserAvatar";
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
          <div className="relative shrink-0" ref={accountMenuRef}>
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
        <nav className="flex gap-2 overflow-x-auto border-t border-[var(--color-border)] px-4 py-2 text-sm lg:hidden">
          {DESKTOP_NAV.slice(0, 6).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "whitespace-nowrap rounded-full px-3 py-1",
                pathname.startsWith(item.href)
                  ? "codex-chip-active"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 lg:pb-6">{children}</main>

      <nav className="codex-nav-bar fixed bottom-0 left-0 right-0 z-20 lg:hidden">
        <div className="mx-auto flex max-w-6xl justify-around py-2">
          {MOBILE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative flex flex-col items-center px-2 py-1 text-xs",
                pathname.startsWith(item.href)
                  ? "text-[var(--color-accent)] drop-shadow-[0_0_8px_var(--color-accent)]"
                  : "text-slate-400"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
      />
      <VoiceIncomingListener />
    </div>
  );
}
