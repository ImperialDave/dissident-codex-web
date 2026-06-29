"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bookmark, KeyRound, LogOut, MessageCircle, User } from "lucide-react";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { DropdownDivider, DropdownItem, DropdownMenu } from "@/components/ui/DropdownMenu";
import { useAuthStore } from "@/stores/authStore";

interface AccountMenuProps {
  variant?: "compact" | "sidebar";
  className?: string;
}

export function AccountMenu({ variant = "compact", className }: AccountMenuProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  if (!user) return null;

  const handleClose = () => setOpen(false);

  function navigate(href: string) {
    handleClose();
    router.push(href);
  }

  function handleLogout() {
    handleClose();
    logout().then(() => router.replace("/login"));
  }

  const menuItems =
    variant === "sidebar" ? (
      <>
        <DropdownItem icon={User} onClick={() => navigate("/profile")}>
          Profile
        </DropdownItem>
        <DropdownItem icon={Bookmark} onClick={() => navigate("/saved")}>
          Saved posts
        </DropdownItem>
        <DropdownItem
          icon={KeyRound}
          onClick={() => {
            handleClose();
            setPasswordOpen(true);
          }}
        >
          Change password
        </DropdownItem>
        <DropdownDivider />
        <DropdownItem icon={LogOut} destructive onClick={handleLogout}>
          Log out
        </DropdownItem>
      </>
    ) : (
      <>
        <DropdownItem icon={MessageCircle} onClick={() => navigate("/chats")}>
          Communities
        </DropdownItem>
        <DropdownItem icon={User} onClick={() => navigate("/profile")}>
          Profile
        </DropdownItem>
        <DropdownDivider />
        <DropdownItem icon={LogOut} destructive onClick={handleLogout}>
          Log out
        </DropdownItem>
      </>
    );

  return (
    <>
      <div className={clsx("relative", className)}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={clsx(
            "codex-account-trigger",
            open && "codex-account-trigger-open",
            variant === "sidebar" && "codex-nav-item codex-nav-item-sidebar w-full"
          )}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Account menu"
        >
          <UserAvatar name={user.displayName} photoUrl={user.photoUrl} size="sm" />
          {variant === "sidebar" && (
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-[15px] font-bold">{user.displayName}</p>
              <p className="truncate text-sm codex-text-muted">
                @{user.displayName.replace(/\s+/g, "").toLowerCase()}
              </p>
            </div>
          )}
        </button>

        <DropdownMenu open={open} onClose={handleClose} align="right">
          {variant === "compact" && (
            <div className="codex-dropdown-header">
              <UserAvatar name={user.displayName} photoUrl={user.photoUrl} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.displayName}</p>
                {user.email && (
                  <p className="truncate text-xs codex-text-muted">{user.email}</p>
                )}
              </div>
            </div>
          )}
          {menuItems}
        </DropdownMenu>
      </div>

      {variant === "sidebar" && (
        <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      )}
    </>
  );
}