"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { AppearancePicker } from "@/components/AppearancePicker";
import { BlockedUsersSection } from "@/components/BlockedUsersSection";
import { MAX_FAVORITE_CATEGORIES } from "@/lib/constants";
import { normalizeCategoryName } from "@/lib/utils";
import {
  getFeedCategoryNames,
  getFavoriteCategories,
  toggleFavoriteCategory,
} from "@/services/categoryService";
import { ProfilePostsList } from "@/components/ProfilePostsList";
import {
  getPostsByUser,
  refreshSavedPostIds,
  togglePostFeedVisibility,
  toggleSavePost,
} from "@/services/postService";
import { mapFirestoreError } from "@/lib/utils";
import { IMAGE_FILE_ACCEPT } from "@/lib/mediaAccept";
import { uploadImage } from "@/services/mediaService";
import { updateProfile } from "@/services/userService";
import { ModerationMenu } from "@/components/ModerationMenu";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuthStore } from "@/stores/authStore";
import type { Post } from "@/models";

export default function ProfilePage() {
  const router = useRouter();
  const { user, refreshUser, logout, isModerator, isFounder } = useAuthStore();
  const [signingOut, setSigningOut] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [bio, setBio] = useState("");
  const [flair, setFlair] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [feedCategories, setFeedCategories] = useState<string[]>([]);
  const [favoriteCategoryIds, setFavoriteCategoryIds] = useState<Set<string>>(new Set());
  const [favoriteError, setFavoriteError] = useState("");
  const [postsLoading, setPostsLoading] = useState(true);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [togglingSavePostId, setTogglingSavePostId] = useState<string | null>(null);
  const [togglingVisibilityPostId, setTogglingVisibilityPostId] = useState<string | null>(null);
  const [postsError, setPostsError] = useState("");

  useEffect(() => {
    if (!user) return;
    setBio(user.bio || "");
    setFlair(user.flair || "");
    setDisplayName(user.displayName || "");
    setPostsLoading(true);
    getPostsByUser(user.uid)
      .then(setPosts)
      .finally(() => setPostsLoading(false));
    refreshSavedPostIds().then(setSavedPostIds);
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

  async function handleToggleSave(postId: string) {
    setTogglingSavePostId(postId);
    setPostsError("");
    try {
      const nowSaved = await toggleSavePost(postId);
      setSavedPostIds((prev) => {
        const next = new Set(prev);
        if (nowSaved) next.add(postId);
        else next.delete(postId);
        return next;
      });
    } catch (err) {
      setPostsError(err instanceof Error ? mapFirestoreError(err.message) : "Failed to update save");
    } finally {
      setTogglingSavePostId(null);
    }
  }

  async function handleToggleFeedVisibility(postId: string) {
    setTogglingVisibilityPostId(postId);
    setPostsError("");
    try {
      const hidden = await togglePostFeedVisibility(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, hiddenFromFeed: hidden } : p))
      );
    } catch (err) {
      setPostsError(err instanceof Error ? mapFirestoreError(err.message) : "Failed to update post");
    } finally {
      setTogglingVisibilityPostId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Profile" accountMenuAlways />
      <div
        className="relative h-32 overflow-hidden border-b border-[var(--color-border)]"
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

      {user.bio && (
        <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm codex-text-muted">
          {user.bio}
        </p>
      )}

      {postsError && (
        <p className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {postsError}
        </p>
      )}

      <ProfilePostsList
        posts={posts}
        loading={postsLoading}
        title="Your posts"
        emptyMessage="No posts yet."
        canModerate={isModerator()}
        savedPostIds={savedPostIds}
        togglingSavePostId={togglingSavePostId}
        onToggleSave={handleToggleSave}
        togglingVisibilityPostId={togglingVisibilityPostId}
        onToggleFeedVisibility={isModerator() ? handleToggleFeedVisibility : undefined}
      />

      <div className="codex-settings-section flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">Account settings</h2>
          <p className="text-sm text-slate-300">{user.email}</p>
          <p className="mt-1 text-xs text-slate-400">
            Update your password here, or use the account menu (avatar on mobile, sidebar on desktop).
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

      <div className="codex-settings-section flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">Session</h2>
          <p className="text-sm text-slate-300">Sign out of Codex on this device.</p>
        </div>
        <button
          type="button"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            try {
              await logout();
              router.replace("/login");
            } finally {
              setSigningOut(false);
            }
          }}
          className="codex-btn-sign-out w-full sm:w-auto disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>

      {(isModerator() || isFounder()) && (
        <div className="codex-settings-section border-b border-blue-500/20 bg-blue-500/5">
          <h2 className="mb-3 font-semibold text-blue-200">
            {isFounder() ? "Founder & Moderation" : "Moderator Menu"}
          </h2>
          <ModerationMenu variant="cards" />
        </div>
      )}

      <div className="codex-settings-section grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Avatar
          <input type="file" accept={IMAGE_FILE_ACCEPT} onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])} className="mt-1 block w-full text-xs" />
        </label>
        <label className="text-sm">
          Banner
          <input type="file" accept={IMAGE_FILE_ACCEPT} onChange={(e) => e.target.files?.[0] && handleBanner(e.target.files[0])} className="mt-1 block w-full text-xs" />
        </label>
      </div>

      <div className="codex-settings-section space-y-3">
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

      <div className="codex-settings-section">
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
                  checked ? "codex-chip-active" : "border border-[var(--color-border)] codex-text-muted hover:text-[var(--color-on-surface)]"
                }`}
              >
                {checked ? "★ " : ""}
                {name}
              </button>
            );
          })}
        </div>
      </div>

      <BlockedUsersSection />

      <div className="codex-settings-section">
        <h2 className="mb-1 font-semibold">Appearance</h2>
        <p className="mb-4 text-xs text-slate-400">
          Light or dark mode, neon or relaxed palettes.
        </p>
        <AppearancePicker compact />
      </div>

      <div className="codex-settings-section">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Saved posts</h2>
            <p className="text-xs codex-text-muted">Posts you bookmarked for later.</p>
          </div>
          <Link href="/saved" className="codex-btn-secondary rounded-full px-4 py-2 text-sm">
            View saved
          </Link>
        </div>
      </div>

      <div className="codex-settings-section text-sm codex-text-muted">
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
