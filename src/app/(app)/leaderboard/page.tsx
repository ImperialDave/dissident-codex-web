"use client";

import { useEffect, useState } from "react";
import { getLeaderboardData } from "@/services/categoryService";
import { getChessLeaderboard } from "@/services/chessService";
import type { ChessLeaderboardEntry, LeaderboardData } from "@/models";

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [chess, setChess] = useState<ChessLeaderboardEntry[]>([]);

  useEffect(() => {
    getLeaderboardData().then(setData);
    getChessLeaderboard().then(setChess);
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Leaderboard</h1>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Top Topics</h2>
        <div className="space-y-2">
          {data?.topTopics.map((t) => (
            <div key={t.roomId} className="flex justify-between rounded-lg border border-white/10 p-3">
              <span>#{t.rank} {t.title}</span>
              <span className="text-[var(--color-accent)]">{t.score} posts</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Top Chats</h2>
        <div className="space-y-2">
          {data?.topChats.map((c) => (
            <div key={c.roomId} className="flex justify-between rounded-lg border border-white/10 p-3">
              <span>#{c.rank} {c.title}</span>
              <span className="text-[var(--color-accent)]">{c.score} messages</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Chess ELO</h2>
        <div className="space-y-2">
          {chess.map((e, i) => (
            <div key={e.uid} className="flex justify-between rounded-lg border border-white/10 p-3">
              <span>#{i + 1} {e.displayName}</span>
              <span className="text-[var(--color-accent)]">{e.elo} ELO</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
