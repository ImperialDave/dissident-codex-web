"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { X } from "lucide-react";
import { AppearanceMenu } from "@/components/AppearanceMenu";
import { ColorModeToggle } from "@/components/ColorModeToggle";
import { useAuthStore } from "@/stores/authStore";
import { FOUNDER_NAV, MOD_NAV, SECONDARY_NAV } from "@/lib/navigation";
import { NavLink } from "./NavLink";

interface MoreMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MoreMenu({ open, onClose }: MoreMenuProps) {
  const pathname = usePathname();
  const { isModerator, isFounder } = useAuthStore();

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div
        className={clsx("codex-sheet-overlay", open && "codex-sheet-overlay-open")}
        onClick={onClose}
        aria-hidden={!open}
      />
      <div
        className={clsx("codex-sheet", open && "codex-sheet-open")}
        role="dialog"
        aria-label="More navigation"
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-lg font-bold">More</h2>
          <button type="button" onClick={onClose} className="codex-btn-icon" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col py-2">
          {SECONDARY_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              variant="more"
              onClick={onClose}
            />
          ))}
          {isModerator() &&
            MOD_NAV.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                variant="more"
                onClick={onClose}
              />
            ))}
          {isFounder() &&
            FOUNDER_NAV.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                variant="more"
                onClick={onClose}
              />
            ))}
        </nav>
        <div className="flex items-center gap-2 border-t border-[var(--color-border)] px-4 py-3">
          <ColorModeToggle variant="compact" />
          <AppearanceMenu />
        </div>
      </div>
    </>
  );
}