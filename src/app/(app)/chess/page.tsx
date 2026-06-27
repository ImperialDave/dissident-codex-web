"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
        Challenge a friend below, or continue an active game.
      </p>

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