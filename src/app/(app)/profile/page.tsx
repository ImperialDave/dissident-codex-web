"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { THEMES } from "@/lib/constants";
import { getPostsByUser } from "@/services/postService";
import { uploadImage } from "@/services/mediaService";
import { updateProfile } from "@/services/userService";
import { ModerationMenu } from "@/components/ModerationMenu";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";
import type { Post } from "@/models";

export default function ProfilePage() {
  const { user, refreshUser, isModerator, isFounder } = useAuthStore();
  const { themeId, setTheme } = useThemeStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [bio, setBio] = useState("");
  const [flair, setFlair] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setBio(user.bio || "");
    setFlair(user.flair || "");
    setDisplayName(user.displayName || "");
    getPostsByUser(user.uid).then(setPosts);
  }, [user]);

  if (!user) return null;

  async function saveProfile() {
    setSaving(true);
    try {
      await updateProfile({ displayName, bio, flair });
      await refreshUser();
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatar(file: File) {
    const url = await uploadImage(file, "profile_pics");
    await updateProfile({ photoUrl: url });
    await refreshUser();
  }

  async function handleBanner(file: File) {
    const url = await uploadImage(file, "profile_backgrounds");
    await updateProfile({ backgroundUrl: url });
    await refreshUser();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div
        className="relative h-40 overflow-hidden rounded-xl bg-[var(--color-surface)]"
        style={user.backgroundUrl ? { backgroundImage: `url(${user.backgroundUrl})`, backgroundSize: "cover" } : undefined}
      >
        <div className="absolute bottom-4 left-4 flex items-end gap-4">
          <UserAvatar name={user.displayName} photoUrl={user.photoUrl} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{user.displayName}</h1>
              <RoleBadge role={user.role} />
            </div>
            {user.flair && <p className="text-sm text-[var(--color-accent)]">{user.flair}</p>}
          </div>
        </div>
      </div>

      {(isModerator() || isFounder()) && (
        <div className="space-y-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <h2 className="font-semibold text-blue-200">
            {isFounder() ? "Founder & Moderation" : "Moderator Menu"}
          </h2>
          <ModerationMenu variant="cards" />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Avatar
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])} className="mt-1 block w-full text-xs" />
        </label>
        <label className="text-sm">
          Banner
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleBanner(e.target.files[0])} className="mt-1 block w-full text-xs" />
        </label>
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-[var(--color-surface)] p-4">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2"
          placeholder="Display name"
        />
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2"
          placeholder="Bio"
        />
        <input
          value={flair}
          onChange={(e) => setFlair(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2"
          placeholder="Flair"
        />
        <button
          onClick={saveProfile}
          disabled={saving}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Theme</h2>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`rounded-full px-3 py-1 text-sm ${themeId === t.id ? "bg-[var(--color-accent)] text-black" : "border border-white/15"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Your Posts ({posts.length})</h2>
        {posts.length === 0 ? (
          <p className="text-slate-400">No posts yet.</p>
        ) : (
          <div className="space-y-2">
            {posts.map((p) => (
              <Link key={p.id} href={`/post/${p.id}`} className="block rounded-lg border border-white/10 p-3 hover:border-[var(--color-accent)]/40">
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-slate-400">{p.category}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 p-4 text-sm text-slate-400">
        <p>Chess ELO: {user.chessElo ?? 1200}</p>
        <p>Games: {user.chessGamesPlayed ?? 0} · W/L/D: {user.chessWins ?? 0}/{user.chessLosses ?? 0}/{user.chessDraws ?? 0}</p>
      </div>
    </div>
  );
}