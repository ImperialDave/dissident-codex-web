"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FriendListRow } from "@/components/FriendListRow";
import { UserAvatar } from "@/components/UserAvatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { buildFriendGameMap } from "@/lib/chessFriends";
import { getOrCreateDmRoom } from "@/services/chatService";
import { getMyActiveGames, startChessGame } from "@/services/chessService";
import { getFriends, getIncomingFriendRequests, respondToFriendRequest } from "@/services/friendService";
import { useAuthStore } from "@/stores/authStore";
import type { ChessGame, Friend, FriendRequest } from "@/models";

export default function FriendsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [gameMap, setGameMap] = useState<Map<string, ChessGame>>(new Map());
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [friendsList, games] = await Promise.all([getFriends(), getMyActiveGames()]);
    setFriends(friendsList);
    if (user?.uid) setGameMap(buildFriendGameMap(games, user.uid));
    setRequests(await getIncomingFriendRequests());
  }, [user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  async function messageFriend(uid: string) {
    setError("");
    setBusyUid(uid);
    try {
      const room = await getOrCreateDmRoom(uid);
      router.push(`/chat/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open chat");
      setBusyUid(null);
    }
  }

  async function playChess(uid: string) {
    setError("");
    setBusyUid(uid);
    try {
      const game = await startChessGame(uid);
      router.push(`/chess/game/${game.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start chess game");
      setBusyUid(null);
    }
  }

  return (
    <div>
      <PageHeader title="Friends" />
      {error && (
        <p className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {requests.length > 0 && (
        <section>
          <p className="border-b border-[var(--color-border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide codex-text-muted">
            Incoming requests
          </p>
          <div>
            {requests.map((r) => (
              <div key={r.id} className="codex-list-row flex items-center justify-between gap-3">
                <Link href={`/user/${r.fromUid}`} className="flex items-center gap-3 hover:opacity-90">
                  <UserAvatar name={r.fromName} photoUrl={r.fromPhotoUrl} />
                  <span>{r.fromName}</span>
                </Link>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await respondToFriendRequest(r.id, true);
                      load();
                    }}
                    className="codex-btn-accent rounded-lg px-3 py-1.5 text-sm"
                  >
                    Accept
                  </button>
                  <button
                    onClick={async () => {
                      await respondToFriendRequest(r.id, false);
                      load();
                    }}
                    className="codex-btn-ghost rounded-lg px-3 py-1.5 text-sm"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="border-b border-[var(--color-border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide codex-text-muted">
          Your friends ({friends.length})
        </p>
        {friends.length === 0 ? (
          <p className="px-4 py-8 text-center codex-text-muted">No friends yet.</p>
        ) : (
          <div>
            {friends.map((f) => (
              <FriendListRow
                key={f.uid}
                friend={f}
                busy={busyUid === f.uid}
                activeGame={gameMap.get(f.uid)}
                showMessageButton
                onMessage={() => messageFriend(f.uid)}
                onChess={() => playChess(f.uid)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}