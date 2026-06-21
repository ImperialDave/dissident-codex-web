"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { getFriends, getIncomingFriendRequests, respondToFriendRequest } from "@/services/friendService";
import type { Friend, FriendRequest } from "@/models";

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);

  async function load() {
    setFriends(await getFriends());
    setRequests(await getIncomingFriendRequests());
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Friends</h1>

      {requests.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Incoming Requests</h2>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-white/10 p-3">
                <div className="flex items-center gap-3">
                  <UserAvatar name={r.fromName} photoUrl={r.fromPhotoUrl} />
                  <span>{r.fromName}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => { await respondToFriendRequest(r.id, true); load(); }}
                    className="rounded bg-[var(--color-accent)] px-3 py-1 text-sm text-black"
                  >
                    Accept
                  </button>
                  <button
                    onClick={async () => { await respondToFriendRequest(r.id, false); load(); }}
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
              <Link
                key={f.uid}
                href={`/user/${f.uid}`}
                className="flex items-center gap-3 rounded-xl border border-white/10 p-3 hover:border-[var(--color-accent)]/40"
              >
                <UserAvatar name={f.displayName} photoUrl={f.photoUrl} />
                <span>{f.displayName}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}