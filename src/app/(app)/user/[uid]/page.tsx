"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FollowButton } from "@/components/FollowButton";
import { ProfilePostsList } from "@/components/ProfilePostsList";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchUser } from "@/services/authService";
import { getOrCreateDmRoom } from "@/services/chatService";
import {
  getPostsByUser,
  refreshSavedPostIds,
  togglePostFeedVisibility,
  toggleSavePost,
} from "@/services/postService";
import {
  getFriendshipStatus,
  getIncomingRequestFrom,
  respondToFriendRequest,
  sendFriendRequest,
} from "@/services/friendService";
import { isFollowing, toggleFollow } from "@/services/followService";
import { startChessGame } from "@/services/chessService";
import { ensureMicrophoneForVoice } from "@/lib/microphonePermission";
import { mapFirestoreError } from "@/lib/utils";
import { startDmVoiceCall } from "@/services/voiceService";
import { useAuthStore } from "@/stores/authStore";
import type { Post, User } from "@/models";

export default function UserProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const router = useRouter();
  const { user: me, isModerator } = useAuthStore();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<string>("none");
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState<"message" | "chess" | "friend" | "call" | "follow" | null>(null);
  const [error, setError] = useState("");
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [togglingSavePostId, setTogglingSavePostId] = useState<string | null>(null);
  const [togglingVisibilityPostId, setTogglingVisibilityPostId] = useState<string | null>(null);

  const isSelf = me?.uid === uid;
  const modView = isModerator();

  useEffect(() => {
    if (me?.uid && me.uid === uid) {
      router.replace("/profile");
    }
  }, [me?.uid, uid, router]);

  useEffect(() => {
    setPostsLoading(true);
    fetchUser(uid).then(setUser);
    getPostsByUser(uid)
      .then(setPosts)
      .finally(() => setPostsLoading(false));
    if (!isSelf) {
      getFriendshipStatus(uid).then(setFriendStatus);
      isFollowing(uid).then(setFollowing);
    }
  }, [uid, isSelf]);

  useEffect(() => {
    if (!me) return;
    refreshSavedPostIds().then(setSavedPostIds);
  }, [me]);

  if (!user) {
    return (
      <div>
        <PageHeader title="Profile" backHref="/feed" />
        <p className="px-4 py-12 text-center codex-text-muted">Loading profile...</p>
      </div>
    );
  }

  async function handleToggleSave(postId: string) {
    setTogglingSavePostId(postId);
    setError("");
    try {
      const nowSaved = await toggleSavePost(postId);
      setSavedPostIds((prev) => {
        const next = new Set(prev);
        if (nowSaved) next.add(postId);
        else next.delete(postId);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? mapFirestoreError(err.message) : "Failed to update save");
    } finally {
      setTogglingSavePostId(null);
    }
  }

  async function handleToggleFeedVisibility(postId: string) {
    setTogglingVisibilityPostId(postId);
    setError("");
    try {
      const hidden = await togglePostFeedVisibility(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, hiddenFromFeed: hidden } : p))
      );
    } catch (err) {
      setError(err instanceof Error ? mapFirestoreError(err.message) : "Failed to update post");
    } finally {
      setTogglingVisibilityPostId(null);
    }
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

  async function startVoiceCall() {
    setError("");
    const mic = await ensureMicrophoneForVoice();
    if (mic.status !== "granted") {
      if (mic.message && mic.status !== "denied") setError(mic.message);
      return;
    }

    setBusy("call");
    try {
      const room = await getOrCreateDmRoom(uid);
      await startDmVoiceCall(room);
      router.push(`/chat/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start voice call");
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

  async function handleToggleFollow() {
    setError("");
    setBusy("follow");
    try {
      const nowFollowing = await toggleFollow(uid);
      setFollowing(nowFollowing);
    } catch (err) {
      setError(err instanceof Error ? mapFirestoreError(err.message) : "Could not update follow");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader title={user.displayName} backHref="/feed" />

      <div
        className="relative h-32 overflow-hidden border-b border-[var(--color-border)]"
        style={
          user.backgroundUrl
            ? { backgroundImage: `url(${user.backgroundUrl})`, backgroundSize: "cover" }
            : undefined
        }
      >
        <div className="absolute bottom-4 left-4 flex items-end gap-4">
          <UserAvatar name={user.displayName} photoUrl={user.photoUrl} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{user.displayName}</h1>
              <RoleBadge role={user.role} />
            </div>
            {user.flair && (
              <p className="text-sm text-[var(--color-accent)]">{user.flair}</p>
            )}
          </div>
        </div>
      </div>

      {user.bio && (
        <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm codex-text-muted">
          {user.bio}
        </p>
      )}

      {error && (
        <p className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <FollowButton
          isFollowing={following}
          busy={busy === "follow"}
          onToggle={handleToggleFollow}
        />
        {friendStatus === "none" && (
          <button
            onClick={addFriend}
            disabled={busy !== null}
            className="codex-btn-accent rounded-full px-4 py-2 text-sm disabled:opacity-50"
          >
            {busy === "friend" ? "Sending..." : "Add friend"}
          </button>
        )}
        {friendStatus === "pending_out" && (
          <span className="codex-btn-ghost rounded-full px-4 py-2 text-sm codex-text-muted">
            Request sent
          </span>
        )}
        {friendStatus === "pending_in" && (
          <button
            onClick={acceptFriend}
            disabled={busy !== null}
            className="codex-btn-accent rounded-full px-4 py-2 text-sm disabled:opacity-50"
          >
            {busy === "friend" ? "Accepting..." : "Accept request"}
          </button>
        )}
        {friendStatus === "friends" && (
          <span className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
            Friends
          </span>
        )}
        <button
          onClick={openChat}
          disabled={busy !== null}
          className="codex-btn-ghost rounded-full px-4 py-2 text-sm disabled:opacity-50"
        >
          {busy === "message" ? "Opening..." : "Message"}
        </button>
        <button
          onClick={startVoiceCall}
          disabled={busy !== null}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
        >
          {busy === "call" ? "Calling..." : "Voice call"}
        </button>
        <button
          onClick={playChess}
          disabled={busy !== null}
          className="codex-btn-ghost rounded-full px-4 py-2 text-sm disabled:opacity-50"
        >
          {busy === "chess" ? "Starting..." : "Play chess"}
        </button>
      </div>

      <div className="border-b border-[var(--color-border)] px-4 py-3 text-sm codex-text-muted">
        Chess ELO: {user.chessElo ?? 1200} · Games: {user.chessGamesPlayed ?? 0} · W/L/D:{" "}
        {user.chessWins ?? 0}/{user.chessLosses ?? 0}/{user.chessDraws ?? 0}
      </div>

      <ProfilePostsList
        posts={posts}
        loading={postsLoading}
        title={`${user.displayName}'s posts`}
        emptyMessage={`${user.displayName} hasn't posted yet.`}
        canModerate={modView}
        savedPostIds={savedPostIds}
        togglingSavePostId={togglingSavePostId}
        onToggleSave={handleToggleSave}
        togglingVisibilityPostId={togglingVisibilityPostId}
        onToggleFeedVisibility={modView ? handleToggleFeedVisibility : undefined}
      />
    </div>
  );
}