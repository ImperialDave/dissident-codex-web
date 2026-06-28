"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { ChessFriendList } from "@/components/ChessFriendList";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMyActiveGames } from "@/services/chessService";
import type { ChessGame } from "@/models";

export default function ChessLobbyPage() {
  const [games, setGames] = useState<ChessGame[]>([]);

  useEffect(() => {
    getMyActiveGames().then(setGames);
    const interval = setInterval(() => getMyActiveGames().then(setGames), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <PageHeader title="Chess" />
      <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm codex-text-muted">
        Play vs bot for practice, challenge a friend, or continue an active game.
      </p>

      <section>
        <p className="border-b border-[var(--color-border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide codex-text-muted">
          Play vs bot
        </p>
        <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm codex-text-muted">
          Local practice — no ELO changes, no notifications.
        </p>
        <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] px-4 py-4">
          <Link
            href="/chess/bot?difficulty=easy"
            className="codex-btn-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
          >
            <Bot className="h-4 w-4" />
            Easy
          </Link>
          <Link
            href="/chess/bot?difficulty=medium"
            className="codex-btn-accent inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold"
          >
            <Bot className="h-4 w-4" />
            Medium
          </Link>
        </div>
      </section>

      <ChessFriendList refreshIntervalMs={5000} />

      <section>
        <p className="border-b border-[var(--color-border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide codex-text-muted">
          Active games
        </p>
        {games.length === 0 ? (
          <p className="px-4 py-8 text-center codex-text-muted">No active games.</p>
        ) : (
          <div>
            {games.map((g) => (
              <Link
                key={g.id}
                href={`/chess/game/${g.id}`}
                className="codex-list-row flex items-center justify-between"
              >
                <span className="font-medium">
                  {g.whiteName} vs {g.blackName}
                </span>
                <span className="text-sm text-[var(--color-accent)]">{g.status}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}