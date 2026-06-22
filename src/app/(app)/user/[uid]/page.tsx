"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { fetchUser } from "@/services/authService";
import { getOrCreateDmRoom } from "@/services/chatService";
import { getPostsByUser } from "@/services/postService";
import {
  getFriendshipStatus,
  getIncomingRequestFrom,
  respondToFriendRequest,
  sendFriendRequest,
} from "@/services/friendService";
import { startChessGame } from "@/services/chessService";
import { useAuthStore } from "@/stores/authStore";
import type { Post, User } from "@/models";

export default function UserProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const router = useRouter();
  const { user: me } = useAuthStore();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friendStatus, setFriendStatus] = useState<string>("none");
  const [busy, setBusy] = useState<"message" | "chess" | "friend" | null>(null);
  const [error, setError] = useState("");

  const isSelf = me?.uid === uid;

  useEffect(() => {
    if (me?.uid && me.uid === uid) {
      router.replace("/profile");
    }
  }, [me?.uid, uid, router]);

  useEffect(() => {
    fetchUser(uid).then(setUser);
    getPostsByUser(uid).then(setPosts);
    if (!isSelf) getFriendshipStatus(uid).then(setFriendStatus);
  }, [uid, isSelf]);

  if (!user) return <p className="text-slate-400">Loading profile...</p>;

  async function openChat() {
    setError("");
    setBusy("message");
    try {
      const room = await getOrCreateDmRoom(uid);
      router.push(`/chat/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open chat");
    } finally {
      setBusy(null);
    }
  }

  async function playChess() {
    setError("");
    setBusy("chess");
    try {
      const game = await startChessGame(uid);
      router.push(`/chess/game/${game.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start chess game");
    } finally {
      setBusy(null);
    }
  }

  async function addFriend() {
    setError("");
    setBusy("friend");
    try {
      await sendFriendRequest(uid);
      setFriendStatus("pending_out");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send friend request");
    } finally {
      setBusy(null);
    }
  }

  async function acceptFriend() {
    setError("");
    setBusy("friend");
    try {
      const req = await getIncomingRequestFrom(uid);
      if (!req) throw new Error("Friend request not found");
      await respondToFriendRequest(req.id, true);
      setFriendStatus("friends");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept request");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <UserAvatar name={user.displayName} photoUrl={user.photoUrl} size="lg" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{user.displayName}</h1>
            <RoleBadge role={user.role} />
          </div>
          {user.flair && <p className="text-[var(--color-accent)]">{user.flair}</p>}
          <p className="text-sm text-slate-400">{user.bio}</p>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {friendStatus === "none" && (
          <button
            onClick={addFriend}
            disabled={busy !== null}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {busy === "friend" ? "Sending..." : "Add friend"}
          </button>
        )}
        {friendStatus === "pending_out" && (
          <span className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-400">
            Request sent
          </span>
        )}
        {friendStatus === "pending_in" && (
          <button
            onClick={acceptFriend}
            disabled={busy !== null}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {busy === "friend" ? "Accepting..." : "Accept friend request"}
          </button>
        )}
        {friendStatus === "friends" && (
          <span className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
            Friends
          </span>
        )}
        <button
          onClick={openChat}
          disabled={busy !== null}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
        >
          {busy === "message" ? "Opening..." : "Message"}
        </button>
        <button
          onClick={playChess}
          disabled={busy !== null}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
        >
          {busy === "chess" ? "Starting..." : "Play chess"}
        </button>
      </div>

      <div className="rounded-xl border border-white/10 p-4 text-sm">
        Chess ELO: {user.chessElo ?? 1200} · Games: {user.chessGamesPlayed ?? 0}
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Posts ({posts.length})</h2>
        <div className="space-y-2">
          {posts.length === 0 ? (
            <p className="text-slate-400">No posts yet.</p>
          ) : (
            posts.map((p) => (
              <a key={p.id} href={`/post/${p.id}`} className="block rounded-lg border border-white/10 p-3 hover:border-[var(--color-accent)]/40">
                {p.title}
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}