"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { SECONDARY_NAV } from "@/lib/navigation";

export function RightRail() {
  return (
    <aside className="codex-right-rail hidden w-[350px] shrink-0 flex-col gap-4 px-6 py-3 2xl:flex">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <Input
          placeholder="Search Codex"
          className="pl-11"
          readOnly
          onFocus={() => {
            window.location.href = "/search";
          }}
        />
      </div>

      <div className="codex-rail-card">
        <h2 className="mb-3 text-xl font-bold">Explore</h2>
        <nav className="flex flex-col">
          {SECONDARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="codex-rail-link py-3 text-[15px] font-medium"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}