"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ModEmpty,
  ModPageShell,
  ModRow,
  ModSection,
  ModStatGrid,
} from "@/components/ModPageShell";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { deleteComment } from "@/services/commentService";
import {
  computeModerationStats,
  getRecentComments,
  getUsersForModeration,
  updateUserRole,
} from "@/services/moderationService";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
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
  const hiddenCount = posts.filter((p) => p.hiddenFromFeed).length;

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
    return <p className="codex-mod-alert">Moderator access required.</p>;
  }

  return (
    <ModPageShell
      title="Mod Tools"
      subtitle="Manage user roles, review posts and comments, and control feed visibility."
    >
      {error && <p className="codex-mod-alert">{error}</p>}

      {stats && (
        <ModStatGrid
          wide
          items={[
            { label: "Total", value: stats.total },
            { label: "Members", value: stats.members },
            { label: "Mods", value: stats.mods },
            { label: "Admins", value: stats.admins },
            { label: "Founders", value: stats.founders, tone: "founder" },
            { label: "Suspended", value: stats.suspended, tone: "warn" },
            { label: "Banned", value: stats.banned, tone: "warn" },
          ]}
        />
      )}

      <ModSection
        title="User Roles"
        hint="Search by display name or flair, then assign a role."
        badge={
          <input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Search users…"
            className="codex-input w-full min-w-[12rem] rounded-lg px-3 py-2 text-sm sm:w-52"
          />
        }
      >
        <div className="max-h-96 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <ModEmpty>No users match your search.</ModEmpty>
          ) : (
            filteredUsers.map((u) => (
              <ModRow key={u.uid}>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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
                <div className="flex shrink-0 flex-wrap items-center gap-2">
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
                    className="codex-input rounded-lg px-2 py-1 text-sm"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  {isFounder() && (
                    <DeleteAccountButton
                      target={u}
                      compact
                      onDeleted={refresh}
                      onError={setError}
                    />
                  )}
                </div>
              </ModRow>
            ))
          )}
        </div>
      </ModSection>

      <ModSection
        title="Recent Posts"
        hint="Hidden posts stay reachable by direct link but are removed from the public feed."
        badge={
          hiddenCount > 0 ? (
            <span className="codex-mod-badge">{hiddenCount} hidden from feed</span>
          ) : undefined
        }
      >
        {posts.length === 0 ? (
          <ModEmpty>No posts loaded.</ModEmpty>
        ) : (
          posts.map((p) => (
            <ModRow key={p.id} highlight={p.hiddenFromFeed ? "hidden" : undefined}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/post/${p.id}`} className="font-medium hover:text-[var(--color-accent)]">
                    {p.title}
                  </Link>
                  {p.hiddenFromFeed && <span className="codex-mod-badge">Hidden from feed</span>}
                </div>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  by {p.authorName} · {p.category}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
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
                  className="codex-btn-danger rounded-lg px-3 py-1 text-sm"
                >
                  Delete
                </button>
              </div>
            </ModRow>
          ))
        )}
      </ModSection>

      <ModSection title="Recent Comments" hint="Remove spam or abusive comments from posts.">
        {comments.length === 0 ? (
          <ModEmpty>No comments loaded.</ModEmpty>
        ) : (
          comments.map((c) => (
            <ModRow key={c.id}>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm">{c.text}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
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
                className="codex-btn-danger shrink-0 rounded-lg px-3 py-1 text-sm"
              >
                Delete
              </button>
            </ModRow>
          ))
        )}
      </ModSection>
    </ModPageShell>
  );
}