"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/UserAvatar";
import { getOrCreateDmRoom } from "@/services/chatService";
import { startChessGame } from "@/services/chessService";
import { getFriends, getIncomingFriendRequests, respondToFriendRequest } from "@/services/friendService";
import type { Friend, FriendRequest } from "@/models";

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setFriends(await getFriends());
    setRequests(await getIncomingFriendRequests());
  }

  useEffect(() => {
    load();
  }, []);

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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Friends</h1>
      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      {requests.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Incoming Requests</h2>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="codex-surface flex items-center justify-between rounded-xl p-3">
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
                    className="codex-btn-accent rounded px-3 py-1 text-sm"
                  >
                    Accept
                  </button>
                  <button
                    onClick={async () => {
                      await respondToFriendRequest(r.id, false);
                      load();
                    }}
                    className="rounded border border-white/15 px-3 py-1 text-sm"
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
        <h2 className="mb-2 font-semibold">Your Friends ({friends.length})</h2>
        {friends.length === 0 ? (
          <p className="text-slate-400">No friends yet.</p>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => (
              <div
                key={f.uid}
                className="codex-surface flex flex-wrap items-center justify-between gap-3 rounded-xl p-3"
              >
                <Link href={`/user/${f.uid}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <UserAvatar name={f.displayName} photoUrl={f.photoUrl} />
                  <span>{f.displayName}</span>
                </Link>
                <div className="flex gap-2">
                  <button
                    onClick={() => messageFriend(f.uid)}
                    disabled={busyUid === f.uid}
                    className="rounded border border-white/15 px-3 py-1 text-sm hover:bg-white/5 disabled:opacity-50"
                  >
                    Message
                  </button>
                  <button
                    onClick={() => playChess(f.uid)}
                    disabled={busyUid === f.uid}
                    className="rounded border border-white/15 px-3 py-1 text-sm hover:bg-white/5 disabled:opacity-50"
                  >
                    Chess
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}