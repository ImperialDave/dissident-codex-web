"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { PRIMARY_NAV } from "@/lib/navigation";
import { NavLink } from "./NavLink";
import { MoreMenu } from "./MoreMenu";

interface BottomNavProps {
  unread: number;
}

export function BottomNav({ unread }: BottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav className="codex-bottom-nav fixed bottom-0 left-0 right-0 z-20 xl:hidden">
        <div className="mx-auto flex max-w-[600px] items-center justify-around px-2 py-1">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              variant="bottom"
              badge={item.href === "/notifications" ? unread : undefined}
            />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="codex-nav-item codex-nav-item-bottom"
            aria-label="More"
          >
            <Menu className="h-[26px] w-[26px]" strokeWidth={1.75} />
          </button>
        </div>
      </nav>
      <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}