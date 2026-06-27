"use client";

import clsx from "clsx";
import { useEffect, useRef, type ReactNode } from "react";

interface DropdownMenuProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function DropdownMenu({
  open,
  onClose,
  children,
  align = "right",
  className,
}: DropdownMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="menu"
      className={clsx(
        "codex-dropdown absolute z-30 mt-1 min-w-[12rem] py-1",
        align === "right" ? "right-0" : "left-0",
        className
      )}
    >
      {children}
    </div>
  );
}

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
  className?: string;
}

export function DropdownItem({
  children,
  onClick,
  destructive,
  className,
}: DropdownItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={clsx(
        "codex-dropdown-item block w-full px-4 py-2.5 text-left text-[15px]",
        destructive && "codex-dropdown-item-danger",
        className
      )}
    >
      {children}
    </button>
  );
}