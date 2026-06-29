"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { RIGHT_RAIL_COMMUNITIES_LIMIT } from "@/lib/constants";
import { SECONDARY_NAV } from "@/lib/navigation";
import { getRankedTopicCommunities } from "@/services/categoryService";
import type { LeaderboardEntry } from "@/models";

export function RightRail() {
  const [communities, setCommunities] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    getRankedTopicCommunities(RIGHT_RAIL_COMMUNITIES_LIMIT, "balanced")
      .then(setCommunities)
      .catch(() => setCommunities([]));
  }, []);

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

      {communities.length > 0 && (
        <div className="codex-rail-card">
          <h2 className="mb-3 text-xl font-bold">Active communities</h2>
          <nav className="flex flex-col">
            {communities.map((entry) => (
              <Link
                key={entry.roomId}
                href={`/chat/${entry.roomId}`}
                className="codex-rail-link py-3 text-[15px] font-medium"
              >
                <span className="text-[var(--color-accent)]">#{entry.rank}</span>{" "}
                {entry.title}
                <span className="ml-1 text-xs codex-text-muted">({entry.messageCount})</span>
              </Link>
            ))}
          </nav>
          <Link
            href="/chats"
            className="mt-2 inline-block text-sm text-[var(--color-accent)] hover:underline"
          >
            View all communities
          </Link>
        </div>
      )}

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