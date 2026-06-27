"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { getLeaderboardData } from "@/services/categoryService";
import { getChessLeaderboard } from "@/services/chessService";
import { mapFirestoreError } from "@/lib/utils";
import type { ChessLeaderboardEntry, LeaderboardData, LeaderboardEntry } from "@/models";

type Tab = "topics" | "chess";

function entryMeta(entry: LeaderboardEntry): string {
  return `${entry.messageCount} messages · ${entry.postCount} posts`;
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("topics");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [chess, setChess] = useState<ChessLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([getLeaderboardData(50), getChessLeaderboard(50)])
      .then(([board, chessBoard]) => {
        setData(board);
        setChess(chessBoard);
      })
      .catch((err) => {
        setError(mapFirestoreError(err instanceof Error ? err.message : "Failed to load leaderboard"));
      })
      .finally(() => setLoading(false));
  }, []);

  const activeEntries = tab === "topics" ? data?.topTopics ?? [] : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Top topics ranked by activity. Tap an entry to open the room.
        </p>
      </div>

      <div className="flex gap-2 rounded-xl border border-white/10 bg-[var(--color-surface)] p-1">
        {(
          [
            { id: "topics" as const, label: "Top Topics" },
            { id: "chess" as const, label: "Chess ELO" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={clsx(
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition",
              tab === item.id
                ? "bg-[var(--color-accent)] text-black"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-slate-400">Loading rankings...</p>}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {!loading && !error && tab !== "chess" && activeEntries.length === 0 && (
        <p className="rounded-xl border border-white/10 bg-[var(--color-surface)] p-6 text-center text-slate-400">
          No activity yet. Join a topic chat to get started!
        </p>
      )}

      {!loading && !error && tab !== "chess" && activeEntries.length > 0 && (
        <div className="space-y-2">
          {activeEntries.map((entry) => (
            <Link
              key={entry.roomId}
              href={`/chat/${entry.roomId}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent)]/40"
            >
              <div className="min-w-0">
                <p className="font-medium text-white">
                  <span className="mr-2 text-[var(--color-accent)]">#{entry.rank}</span>
                  {entry.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{entryMeta(entry)}</p>
              </div>
              {tab === "topics" && (
                <span className="shrink-0 text-sm font-semibold text-[var(--color-accent)]">
                  {entry.score} pts
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {!loading && !error && tab === "chess" && (
        <div className="space-y-2">
          {chess.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[var(--color-surface)] p-6 text-center text-slate-400">
              No rated chess games yet. Finish a match to appear here!
            </p>
          ) : (
            chess.map((entry, index) => (
              <Link
                key={entry.uid}
                href={`/user/${entry.uid}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent)]/40"
              >
                <p className="font-medium text-white">
                  <span className="mr-2 text-[var(--color-accent)]">#{index + 1}</span>
                  {entry.displayName}
                </p>
                <span className="shrink-0 text-sm font-semibold text-[var(--color-accent)]">
                  {entry.elo} ELO
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
