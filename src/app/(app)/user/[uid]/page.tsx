"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { fetchUser } from "@/services/authService";
import { getOrCreateDmRoom } from "@/services/chatService";
import { getPostsByUser } from "@/services/postService";
import { getFriendshipStatus, sendFriendRequest } from "@/services/friendService";
import { startChessGame } from "@/services/chessService";
import type { Post, User } from "@/models";

export default function UserProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friendStatus, setFriendStatus] = useState<string>("none");
  const [busy, setBusy] = useState<"message" | "chess" | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([fetchUser(uid), getPostsByUser(uid), getFriendshipStatus(uid)])
      .then(([profile, userPosts, status]) => {
        if (cancelled) return;
        setUser(profile);
        setPosts(userPosts);
        setFriendStatus(status);
        if (!profile) setLoadError("User not found.");
      })
      .catch((err) => {
        if (cancelled) return;
        setUser(null);
        setLoadError(err instanceof Error ? err.message : "Failed to load profile");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (loading) return <p className="text-slate-400">Loading profile...</p>;
  if (loadError || !user) {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
        {loadError || "User not found."}
      </div>
    );
  }

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

      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {friendStatus === "none" && (
          <button
            onClick={async () => {
              await sendFriendRequest(uid);
              setFriendStatus("pending_out");
            }}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black"
          >
            Add friend
          </button>
        )}
        {friendStatus === "pending_out" && <span className="text-sm text-slate-400">Request sent</span>}
        {friendStatus === "friends" && <span className="text-sm text-green-400">Friends</span>}
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
          {posts.map((p) => (
            <a key={p.id} href={`/post/${p.id}`} className="block rounded-lg border border-white/10 p-3">
              {p.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
