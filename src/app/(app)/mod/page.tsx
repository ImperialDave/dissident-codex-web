"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ModerationMenu } from "@/components/ModerationMenu";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { deleteComment } from "@/services/commentService";
import {
  computeModerationStats,
  getRecentComments,
  getUsersForModeration,
  updateUserRole,
} from "@/services/moderationService";
import { PostFeedVisibilityToggle } from "@/components/PostFeedVisibilityToggle";
import { deletePost, getPosts, togglePostFeedVisibility } from "@/services/postService";
import { useAuthStore } from "@/stores/authStore";
import { roleFromString, type Comment, type RoleName, type User, type Post } from "@/models";

const BASE_ROLES: RoleName[] = ["USER", "MOD", "ADMIN", "SUSPENDED", "BANNED"];

export default function ModToolsPage() {
  const { isModerator, isFounder } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof computeModerationStats> | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [error, setError] = useState("");
  const [togglingPostId, setTogglingPostId] = useState<string | null>(null);

  const roles = isFounder() ? (["FOUNDER", ...BASE_ROLES] as RoleName[]) : BASE_ROLES;

  async function refresh() {
    const [u, p, c] = await Promise.all([
      getUsersForModeration(),
      getPosts(null, 30, { includeHidden: true }),
      getRecentComments(40),
    ]);
    setUsers(u);
    setStats(computeModerationStats(u));
    setPosts(p);
    setComments(c as Comment[]);
  }

  useEffect(() => {
    if (!isModerator()) return;
    refresh().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load moderation data")
    );
  }, [isModerator]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        (u.flair?.toLowerCase().includes(q) ?? false)
    );
  }, [users, userQuery]);

  if (!isModerator()) {
    return <p className="text-red-400">Moderator access required.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Mod Tools</h1>
        <ModerationMenu variant="pills" />
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:grid-cols-7">
          <div className="rounded-lg border border-white/10 p-3">Total: {stats.total}</div>
          <div className="rounded-lg border border-white/10 p-3">Members: {stats.members}</div>
          <div className="rounded-lg border border-white/10 p-3">Mods: {stats.mods}</div>
          <div className="rounded-lg border border-white/10 p-3">Admins: {stats.admins}</div>
          <div className="rounded-lg border border-white/10 p-3">Founders: {stats.founders}</div>
          <div className="rounded-lg border border-white/10 p-3">Suspended: {stats.suspended}</div>
          <div className="rounded-lg border border-white/10 p-3">Banned: {stats.banned}</div>
        </div>
      )}

      <section className="space-y-3 rounded-xl border border-white/10 bg-[var(--color-surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">User Roles</h2>
          <input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Search users..."
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
          />
        </div>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {filteredUsers.map((u) => (
            <div
              key={u.uid}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 p-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <UserAvatar name={u.displayName} photoUrl={u.photoUrl} size="sm" userId={u.uid} />
                <div className="min-w-0">
                  <Link href={`/user/${u.uid}`} className="font-medium hover:text-[var(--color-accent)]">
                    {u.displayName}
                  </Link>
                  {u.flair && (
                    <p className="truncate text-xs text-[var(--color-accent)]">{u.flair}</p>
                  )}
                </div>
                <RoleBadge role={u.role} />
              </div>
              <select
                value={roleFromString(u.role)}
                onChange={async (e) => {
                  try {
                    setError("");
                    await updateUserRole(u.uid, e.target.value as RoleName);
                    await refresh();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Role update failed");
                  }
                }}
                className="rounded border border-white/15 bg-black/20 px-2 py-1 text-sm"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2 rounded-xl border border-white/10 bg-[var(--color-surface)] p-4">
        <h2 className="font-semibold">Recent Posts</h2>
        {posts.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 p-3"
          >
            <div className="min-w-0">
              <Link href={`/post/${p.id}`} className="font-medium hover:text-[var(--color-accent)]">
                {p.title}
              </Link>
              <p className="text-xs text-slate-500">
                by {p.authorName} · {p.category}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PostFeedVisibilityToggle
                hiddenFromFeed={p.hiddenFromFeed}
                disabled={togglingPostId === p.id}
                compact
                onToggle={async () => {
                  setTogglingPostId(p.id);
                  try {
                    const hidden = await togglePostFeedVisibility(p.id);
                    setPosts((prev) =>
                      prev.map((post) =>
                        post.id === p.id ? { ...post, hiddenFromFeed: hidden } : post
                      )
                    );
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to update post");
                  } finally {
                    setTogglingPostId(null);
                  }
                }}
              />
              <button
                onClick={async () => {
                  if (!confirm("Delete this post?")) return;
                  await deletePost(p.id);
                  setPosts(await getPosts(null, 30, { includeHidden: true }));
                }}
                className="text-sm text-red-400"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-2 rounded-xl border border-white/10 bg-[var(--color-surface)] p-4">
        <h2 className="font-semibold">Recent Comments</h2>
        {comments.length === 0 ? (
          <p className="text-sm text-slate-400">No comments loaded.</p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-white/10 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-200 line-clamp-2">{c.text}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {c.authorName} ·{" "}
                  <Link href={`/post/${c.postId}`} className="text-[var(--color-accent)]">
                    View post
                  </Link>
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!confirm("Delete this comment?")) return;
                  await deleteComment(c.id, c.postId);
                  setComments((await getRecentComments(40)) as Comment[]);
                }}
                className="text-sm text-red-400"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
