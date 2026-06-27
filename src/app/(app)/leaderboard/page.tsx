"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { PageHeader } from "@/components/ui/PageHeader";
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
    <div>
      <PageHeader title="Leaderboard" />

      <div className="codex-tab-bar">
        {(
          [
            { id: "topics" as const, label: "Topics" },
            { id: "chess" as const, label: "Chess" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={clsx("codex-tab", tab === item.id && "codex-tab-active")}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && (
        <p className="px-4 py-8 text-center codex-text-muted">Loading rankings...</p>
      )}

      {error && (
        <p className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {!loading && !error && tab !== "chess" && activeEntries.length === 0 && (
        <p className="px-4 py-12 text-center codex-text-muted">
          No activity yet. Join a topic chat to get started!
        </p>
      )}

      {!loading && !error && tab !== "chess" && activeEntries.length > 0 && (
        <div>
          {activeEntries.map((entry) => (
            <Link
              key={entry.roomId}
              href={`/chat/${entry.roomId}`}
              className="codex-list-row flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  <span className="mr-2 text-[var(--color-accent)]">#{entry.rank}</span>
                  {entry.title}
                </p>
                <p className="mt-0.5 text-xs codex-text-muted">{entryMeta(entry)}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-[var(--color-accent)]">
                {entry.score} pts
              </span>
            </Link>
          ))}
        </div>
      )}

      {!loading && !error && tab === "chess" && (
        <div>
          {chess.length === 0 ? (
            <p className="px-4 py-12 text-center codex-text-muted">
              No rated chess games yet.
            </p>
          ) : (
            chess.map((entry, index) => (
              <Link
                key={entry.uid}
                href={`/user/${entry.uid}`}
                className="codex-list-row flex items-center justify-between gap-3"
              >
                <p className="font-medium">
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