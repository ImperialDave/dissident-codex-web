"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { AppearancePicker } from "@/components/AppearancePicker";
import { MAX_FAVORITE_CATEGORIES } from "@/lib/constants";
import { normalizeCategoryName } from "@/lib/utils";
import {
  getFeedCategoryNames,
  getFavoriteCategories,
  toggleFavoriteCategory,
} from "@/services/categoryService";
import { getPostsByUser } from "@/services/postService";
import { uploadImage } from "@/services/mediaService";
import { updateProfile } from "@/services/userService";
import { ModerationMenu } from "@/components/ModerationMenu";
import { useAuthStore } from "@/stores/authStore";
import type { Post } from "@/models";

export default function ProfilePage() {
  const { user, refreshUser, isModerator, isFounder } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [bio, setBio] = useState("");
  const [flair, setFlair] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [feedCategories, setFeedCategories] = useState<string[]>([]);
  const [favoriteCategoryIds, setFavoriteCategoryIds] = useState<Set<string>>(new Set());
  const [favoriteError, setFavoriteError] = useState("");

  useEffect(() => {
    if (!user) return;
    setBio(user.bio || "");
    setFlair(user.flair || "");
    setDisplayName(user.displayName || "");
    getPostsByUser(user.uid).then(setPosts);
    getFeedCategoryNames().then((cats) =>
      setFeedCategories(cats.filter((c) => c !== "All"))
    );
    getFavoriteCategories(user.uid).then((favs) =>
      setFavoriteCategoryIds(new Set(favs.map((f) => f.categoryId)))
    );
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
        className="codex-surface relative h-40 overflow-hidden rounded-xl"
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

      <div className="codex-surface flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
        <div>
          <h2 className="font-semibold text-white">Account settings</h2>
          <p className="text-sm text-slate-300">{user.email}</p>
          <p className="mt-1 text-xs text-slate-400">
            Update your password from here or the account menu in the top-right header.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPasswordDialogOpen(true)}
          className="codex-btn-accent rounded-lg px-4 py-2 text-sm"
        >
          Change password
        </button>
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

      <div className="codex-surface space-y-3 rounded-xl p-4">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="codex-input w-full rounded-lg px-3 py-2"
          placeholder="Display name"
        />
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="codex-input w-full rounded-lg px-3 py-2"
          placeholder="Bio"
        />
        <input
          value={flair}
          onChange={(e) => setFlair(e.target.value)}
          className="codex-input w-full rounded-lg px-3 py-2"
          placeholder="Flair"
        />
        <button
          onClick={saveProfile}
          disabled={saving}
          className="codex-btn-accent rounded-lg px-4 py-2 text-sm"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </div>

      <div className="codex-surface rounded-xl p-4">
        <h2 className="mb-1 font-semibold">Favorite communities</h2>
        <p className="mb-3 text-xs text-slate-400">
          Pin up to {MAX_FAVORITE_CATEGORIES} topics — their posts appear first on your feed.
        </p>
        {favoriteError && (
          <p className="mb-2 text-sm text-red-300">{favoriteError}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {feedCategories.map((name) => {
            const categoryId = normalizeCategoryName(name);
            const checked = favoriteCategoryIds.has(categoryId);
            return (
              <button
                key={categoryId}
                type="button"
                onClick={async () => {
                  setFavoriteError("");
                  try {
                    await toggleFavoriteCategory(categoryId, name);
                    const favs = await getFavoriteCategories(user.uid);
                    setFavoriteCategoryIds(new Set(favs.map((f) => f.categoryId)));
                  } catch (err) {
                    setFavoriteError(err instanceof Error ? err.message : "Failed to update favorite");
                  }
                }}
                className={`rounded-full px-3 py-1 text-sm ${
                  checked ? "codex-chip-active" : "border border-white/15 text-slate-300 hover:text-white"
                }`}
              >
                {checked ? "★ " : ""}
                {name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="codex-surface rounded-xl p-4">
        <h2 className="mb-1 font-semibold">Appearance</h2>
        <p className="mb-4 text-xs text-slate-400">
          Light or dark mode, neon or relaxed palettes.
        </p>
        <AppearancePicker compact />
      </div>

      <div className="codex-surface rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Saved posts</h2>
            <p className="text-xs text-slate-400">Posts you bookmarked for later.</p>
          </div>
          <Link
            href="/saved"
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
          >
            View saved
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Your Posts ({posts.length})</h2>
        {posts.length === 0 ? (
          <p className="text-slate-400">No posts yet.</p>
        ) : (
          <div className="space-y-2">
            {posts.map((p) => (
              <Link key={p.id} href={`/post/${p.id}`} className="codex-surface codex-surface-hover block rounded-lg p-3">
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-slate-400">{p.category}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="codex-surface rounded-xl p-4 text-sm text-slate-400">
        <p>Chess ELO: {user.chessElo ?? 1200}</p>
        <p>Games: {user.chessGamesPlayed ?? 0} · W/L/D: {user.chessWins ?? 0}/{user.chessLosses ?? 0}/{user.chessDraws ?? 0}</p>
      </div>

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
      />
    </div>
  );
}
