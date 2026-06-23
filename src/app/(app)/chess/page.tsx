"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Chess Lobby</h1>
      <p className="text-sm text-slate-400">
        Challenge someone from their profile page, or continue an active game below.
      </p>
      {games.length === 0 ? (
        <p className="text-slate-400">No active games.</p>
      ) : (
        <div className="space-y-2">
          {games.map((g) => (
            <Link
              key={g.id}
              href={`/chess/game/${g.id}`}
              className="codex-surface codex-surface-hover flex justify-between rounded-xl p-4"
            >
              <span>{g.whiteName} vs {g.blackName}</span>
              <span className="text-sm text-[var(--color-accent)]">{g.status}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}