"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FriendListRow } from "@/components/FriendListRow";
import { buildFriendGameMap, sortFriendsForChess } from "@/lib/chessFriends";
import { getMyActiveGames, startChessGame } from "@/services/chessService";
import { getFriends } from "@/services/friendService";
import { useAuthStore } from "@/stores/authStore";
import type { ChessGame, Friend } from "@/models";
import { sanitizeUserError } from "@/lib/utils";

interface ChessFriendListProps {
  refreshIntervalMs?: number;
}

export function ChessFriendList({ refreshIntervalMs = 5000 }: ChessFriendListProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [gameMap, setGameMap] = useState<Map<string, ChessGame>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user?.uid) return;
    const [friendsList, games] = await Promise.all([getFriends(), getMyActiveGames()]);
    const map = buildFriendGameMap(games, user.uid);
    setGameMap(map);
    setFriends(sortFriendsForChess(friendsList, map));
    setLoading(false);
  }, [user?.uid]);

  useEffect(() => {
    load();
    if (!refreshIntervalMs) return;
    const interval = setInterval(load, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [load, refreshIntervalMs]);

  async function handlePlay(uid: string) {
    setError("");
    setBusyUid(uid);
    try {
      const game = await startChessGame(uid);
      router.push(`/chess/game/${game.id}`);
    } catch (err) {
      setError(sanitizeUserError(err, "Could not start chess game"));
      setBusyUid(null);
    }
  }

  if (loading) {
    return (
      <section>
        <p className="border-b border-[var(--color-border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide codex-text-muted">
          Challenge a friend
        </p>
        <p className="px-4 py-6 text-center text-sm codex-text-muted">Loading friends...</p>
      </section>
    );
  }

  return (
    <section>
      {error && (
        <p className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}
      <p className="border-b border-[var(--color-border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide codex-text-muted">
        Challenge a friend
      </p>
      {friends.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm codex-text-muted">
          No friends yet.{" "}
          <Link href="/friends" className="text-[var(--color-accent)] hover:underline">
            Add friends
          </Link>{" "}
          to challenge them to chess.
        </p>
      ) : (
        <div>
          {friends.map((friend) => (
            <FriendListRow
              key={friend.uid}
              friend={friend}
              busy={busyUid === friend.uid}
              activeGame={gameMap.get(friend.uid)}
              onChess={() => handlePlay(friend.uid)}
            />
          ))}
        </div>
      )}
    </section>
  );
}