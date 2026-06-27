"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/UserAvatar";
import { PageHeader } from "@/components/ui/PageHeader";
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
              <div
                key={f.uid}
                className="codex-list-row flex flex-wrap items-center justify-between gap-3"
              >
                <Link href={`/user/${f.uid}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <UserAvatar name={f.displayName} photoUrl={f.photoUrl} />
                  <span>{f.displayName}</span>
                </Link>
                <div className="flex gap-2">
                  <button
                    onClick={() => messageFriend(f.uid)}
                    disabled={busyUid === f.uid}
                    className="codex-btn-secondary rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    Message
                  </button>
                  <button
                    onClick={() => playChess(f.uid)}
                    disabled={busyUid === f.uid}
                    className="codex-btn-ghost rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
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