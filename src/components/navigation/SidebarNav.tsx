"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { PenSquare } from "lucide-react";
import { AppearanceMenu } from "@/components/AppearanceMenu";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { ColorModeToggle } from "@/components/ColorModeToggle";
import { DropdownItem, DropdownMenu } from "@/components/ui/DropdownMenu";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuthStore } from "@/stores/authStore";
import {
  FOUNDER_NAV,
  MOD_NAV,
  PRIMARY_NAV,
  SECONDARY_NAV,
} from "@/lib/navigation";
import { NavLink } from "./NavLink";

interface SidebarNavProps {
  unread: number;
}

export function SidebarNav({ unread }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isModerator, isFounder } = useAuthStore();
  const [accountOpen, setAccountOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  if (!user) return null;

  const sidebarPrimary = PRIMARY_NAV.filter((item) => item.href !== "/create");

  return (
    <>
      <aside className="codex-sidebar hidden w-[275px] shrink-0 px-3 py-2 xl:flex">
        <Link href="/feed" className="codex-logo mb-2 block shrink-0 px-3 py-3 text-2xl">
          Codex
        </Link>

        <div className="codex-sidebar-scroll">
          <nav className="flex flex-col gap-0.5">
            {sidebarPrimary.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                variant="sidebar"
                badge={item.href === "/notifications" ? unread : undefined}
              />
            ))}
          </nav>

          <Link href="/create" className="codex-btn-accent mt-4 flex items-center justify-center gap-2 rounded-full py-3 text-[17px] font-bold">
            <PenSquare className="h-5 w-5" />
            Post
          </Link>

          <div className="mt-4 border-t border-[var(--color-border)] pt-4 pb-2">
            <p className="codex-text-muted mb-2 px-4 text-xs font-semibold uppercase tracking-wide">
              More
            </p>
            <nav className="flex flex-col gap-0.5">
              {SECONDARY_NAV.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} variant="sidebar" />
              ))}
              {isModerator() &&
                MOD_NAV.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} variant="sidebar" />
                ))}
              {isFounder() &&
                FOUNDER_NAV.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} variant="sidebar" />
                ))}
            </nav>
          </div>
        </div>

        <div className="codex-sidebar-footer">
          <div className="flex items-center gap-1 px-2">
            <ColorModeToggle variant="compact" />
            <AppearanceMenu />
          </div>

          <div className="relative mt-2 px-1 pb-2">
            <button
              type="button"
              onClick={() => setAccountOpen((o) => !o)}
              className="codex-nav-item codex-nav-item-sidebar w-full"
              aria-expanded={accountOpen}
              aria-haspopup="menu"
            >
              <UserAvatar name={user.displayName} photoUrl={user.photoUrl} size="sm" />
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-[15px] font-bold">{user.displayName}</p>
                <p className="truncate text-sm codex-text-muted">@{user.displayName.replace(/\s+/g, "").toLowerCase()}</p>
              </div>
            </button>
            <DropdownMenu open={accountOpen} onClose={() => setAccountOpen(false)}>
              <DropdownItem
                onClick={() => {
                  setAccountOpen(false);
                  router.push("/profile");
                }}
              >
                Profile
              </DropdownItem>
              <DropdownItem
                onClick={() => {
                  setAccountOpen(false);
                  router.push("/saved");
                }}
              >
                Saved posts
              </DropdownItem>
              <DropdownItem
                onClick={() => {
                  setAccountOpen(false);
                  setPasswordOpen(true);
                }}
              >
                Change password
              </DropdownItem>
              <DropdownItem
                destructive
                onClick={() => {
                  setAccountOpen(false);
                  logout().then(() => router.replace("/login"));
                }}
              >
                Log out
              </DropdownItem>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  );
}