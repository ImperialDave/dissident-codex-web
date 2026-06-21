"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RoleBadge } from "@/components/RoleBadge";
import { computeModerationStats, getUsersForModeration, updateUserRole } from "@/services/moderationService";
import { deletePost, getPosts } from "@/services/postService";
import { useAuthStore } from "@/stores/authStore";
import { roleFromString, type RoleName, type User, type Post } from "@/models";

const ROLES: RoleName[] = ["USER", "MOD", "ADMIN", "SUSPENDED", "BANNED"];

export default function ModToolsPage() {
  const { isModerator } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof computeModerationStats> | null>(null);

  useEffect(() => {
    if (!isModerator()) return;
    getUsersForModeration().then((u) => {
      setUsers(u);
      setStats(computeModerationStats(u));
    });
    getPosts(null, 30).then(setPosts);
  }, [isModerator]);

  if (!isModerator()) {
    return <p className="text-red-400">Moderator access required.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mod Tools</h1>
        <Link href="/mod/topics" className="text-sm text-[var(--color-accent)]">
          Manage topics →
        </Link>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div className="rounded-lg border border-white/10 p-3">Total: {stats.total}</div>
          <div className="rounded-lg border border-white/10 p-3">Members: {stats.members}</div>
          <div className="rounded-lg border border-white/10 p-3">Mods: {stats.mods}</div>
          <div className="rounded-lg border border-white/10 p-3">Banned: {stats.banned}</div>
        </div>
      )}

      <section>
        <h2 className="mb-2 font-semibold">User Roles</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {users.map((u) => (
            <div key={u.uid} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 p-3">
              <div className="flex items-center gap-2">
                <span>{u.displayName}</span>
                <RoleBadge role={u.role} />
              </div>
              <select
                value={roleFromString(u.role)}
                onChange={async (e) => {
                  await updateUserRole(u.uid, e.target.value as RoleName);
                  const refreshed = await getUsersForModeration();
                  setUsers(refreshed);
                  setStats(computeModerationStats(refreshed));
                }}
                className="rounded border border-white/15 bg-black/20 px-2 py-1 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Recent Posts</h2>
        <div className="space-y-2">
          {posts.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-white/10 p-3">
              <a href={`/post/${p.id}`} className="font-medium hover:text-[var(--color-accent)]">{p.title}</a>
              <button
                onClick={async () => { await deletePost(p.id); setPosts(await getPosts(null, 30)); }}
                className="text-sm text-red-400"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}