"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DmStripCard } from "@/components/DmStripCard";
import { PostCard } from "@/components/PostCard";
import { useDmDisplayNames } from "@/hooks/useDmDisplayNames";
import { chatRoomDisplayTitle } from "@/lib/chatDisplay";
import { ALL_CATEGORY_LABEL, FEED_DM_STRIP_LIMIT } from "@/lib/constants";
import { partitionFeedPosts } from "@/lib/feedRank";
import { mapFirestoreError } from "@/lib/utils";
import { getFavoriteCategories } from "@/services/categoryService";
import { getRecentDmRooms } from "@/services/chatService";
import {
  getPosts,
  refreshSavedPostIds,
  togglePostFeedVisibility,
  toggleSavePost,
} from "@/services/postService";
import { useAuthStore } from "@/stores/authStore";
import type { ChatRoom, FavoriteCategory, Post } from "@/models";

function matchesSearch(post: Post, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    post.title.toLowerCase().includes(q) ||
    post.body.toLowerCase().includes(q) ||
    post.authorName.toLowerCase().includes(q)
  );
}

export default function FeedPage() {
  const searchParams = useSearchParams();
  const { user, isModerator } = useAuthStore();
  const [favoritePosts, setFavoritePosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [dmRooms, setDmRooms] = useState<ChatRoom[]>([]);
  const dmDisplayNames = useDmDisplayNames(dmRooms, user?.uid);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingPostId, setTogglingPostId] = useState<string | null>(null);
  const [togglingSavePostId, setTogglingSavePostId] = useState<string | null>(null);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [favoriteCategories, setFavoriteCategories] = useState<FavoriteCategory[]>([]);
  const modView = isModerator();
  const showPriority = category === ALL_CATEGORY_LABEL;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [data, favorites, dms] = await Promise.all([
        getPosts(category === ALL_CATEGORY_LABEL ? null : category, 50, {
          includeHidden: modView,
        }),
        getFavoriteCategories(),
        showPriority ? getRecentDmRooms(FEED_DM_STRIP_LIMIT) : Promise.resolve([]),
      ]);
      setDmRooms(dms);
      setFavoriteCategories(favorites);

      const filtered = data.filter((p) => matchesSearch(p, search));

      if (showPriority) {
        const favoriteNames = new Set(favorites.map((f) => f.name.toLowerCase()));
        const { favoritePosts: fav, allPosts: rest } = partitionFeedPosts(filtered, favoriteNames);
        setFavoritePosts(fav);
        setAllPosts(rest);
      } else {
        setFavoritePosts([]);
        setAllPosts(filtered);
      }
    } catch (err) {
      setFavoritePosts([]);
      setAllPosts([]);
      setDmRooms([]);
      const message = err instanceof Error ? err.message : "Failed to load feed";
      setError(mapFirestoreError(message));
    } finally {
      setLoading(false);
    }
  }, [category, search, modView, showPriority]);

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
    setTogglingPostId(postId);
    setError("");
    try {
      const hidden = await togglePostFeedVisibility(postId);
      const update = (p: Post) => (p.id === postId ? { ...p, hiddenFromFeed: hidden } : p);
      setFavoritePosts((prev) => prev.map(update));
      setAllPosts((prev) => prev.map(update));
    } catch (err) {
      setError(err instanceof Error ? mapFirestoreError(err.message) : "Failed to update post");
    } finally {
      setTogglingPostId(null);
    }
  }

  useEffect(() => {
    const fromUrl = searchParams.get("category");
    if (fromUrl?.trim()) setCategory(fromUrl.trim());
  }, [searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    refreshSavedPostIds().then(setSavedPostIds);
  }, [user]);

  const hasPosts = favoritePosts.length > 0 || allPosts.length > 0;

  function renderPostList(posts: Post[], priorityLabel?: string) {
    return posts.map((post) => (
      <PostCard
        key={post.id}
        post={post}
        canModerate={modView}
        togglingVisibility={togglingPostId === post.id}
        onToggleFeedVisibility={modView ? handleToggleFeedVisibility : undefined}
        saved={savedPostIds.has(post.id)}
        togglingSave={togglingSavePostId === post.id}
        onToggleSave={handleToggleSave}
        priorityLabel={priorityLabel}
      />
    ));
  }

  return (
    <div className="space-y-4">
      <div className="codex-page-header">
        <h1 className="codex-page-title">Feed</h1>
        <div className="codex-page-actions w-full sm:w-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts..."
            className="codex-input min-w-0 flex-1 rounded-lg px-4 py-2 text-sm sm:min-w-[12rem]"
          />
          <Link
            href="/create"
            className="codex-btn-accent shrink-0 rounded-lg px-4 py-2 text-center text-sm"
          >
            Create post
          </Link>
        </div>
      </div>

      {favoriteCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory(ALL_CATEGORY_LABEL)}
            className={`rounded-full px-3 py-1 text-sm ${
              category === ALL_CATEGORY_LABEL
                ? "codex-chip-active"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All
          </button>
          {favoriteCategories.map((fav) => (
            <button
              key={fav.categoryId}
              type="button"
              onClick={() => setCategory(fav.name)}
              className={`rounded-full px-3 py-1 text-sm ${
                category === fav.name
                  ? "codex-chip-active"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
            ★ {fav.name}
            </button>
          ))}
        </div>
      )}

      {showPriority && favoriteCategories.length === 0 && (
        <p className="codex-text-muted text-sm">
          Pin topics on{" "}
          <Link href="/topics" className="text-[var(--color-accent)] hover:underline">
            Topics
          </Link>{" "}
          or your{" "}
          <Link href="/profile" className="text-[var(--color-accent)] hover:underline">
            profile
          </Link>{" "}
          to filter and prioritize them here.
        </p>
      )}

      {modView && (
        <p className="codex-text-muted text-sm">
          Moderator view: hidden posts stay visible here so you can unhide them. Members will not
          see hidden posts in the feed.
        </p>
      )}

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading posts...</p>
      ) : (
        <>
          {showPriority && dmRooms.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Messages</h2>
                <Link href="/chats" className="text-sm text-[var(--color-accent)]">
                  See all →
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {dmRooms.map((room) => (
                  <DmStripCard
                    key={room.id}
                    room={room}
                    displayTitle={
                      user?.uid
                        ? chatRoomDisplayTitle(room, user.uid, dmDisplayNames)
                        : room.title
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {showPriority && favoritePosts.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">From your communities</h2>
              {renderPostList(favoritePosts, "Community")}
            </section>
          )}

          {!hasPosts ? (
            <div className="codex-surface rounded-xl p-6 text-center">
              <p className="text-slate-400">No posts yet. Be the first to create one!</p>
              <Link
                href="/create"
                className="codex-btn-accent mt-4 inline-block rounded-lg px-5 py-2"
              >
                Create the first post
              </Link>
            </div>
          ) : (
            <section className="space-y-3">
              {showPriority && (dmRooms.length > 0 || favoritePosts.length > 0) && (
                <h2 className="text-lg font-semibold">All posts</h2>
              )}
              {!showPriority && (
                <h2 className="text-lg font-semibold">{category}</h2>
              )}
              {renderPostList(allPosts)}
            </section>
          )}
        </>
      )}
    </div>
  );
}
