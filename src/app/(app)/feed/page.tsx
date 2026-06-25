"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DmStripCard } from "@/components/DmStripCard";
import { PostCard } from "@/components/PostCard";
import { FavoriteStar } from "@/components/FavoriteStar";
import { ALL_CATEGORY_LABEL, FEED_DM_STRIP_LIMIT, MAX_FAVORITE_CATEGORIES } from "@/lib/constants";
import { partitionFeedPosts } from "@/lib/feedRank";
import { mapFirestoreError, normalizeCategoryName } from "@/lib/utils";
import {
  getFavoriteCategories,
  getFeedCategoryNames,
  getFeedHiddenTopics,
  toggleFavoriteCategory,
} from "@/services/categoryService";
import { getRecentDmRooms } from "@/services/chatService";
import { getPosts, togglePostFeedVisibility } from "@/services/postService";
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
  const { isModerator } = useAuthStore();
  const [favoritePosts, setFavoritePosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [dmRooms, setDmRooms] = useState<ChatRoom[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingPostId, setTogglingPostId] = useState<string | null>(null);
  const [hiddenTopics, setHiddenTopics] = useState<Set<string>>(new Set());
  const [favoriteCategories, setFavoriteCategories] = useState<FavoriteCategory[]>([]);
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null);
  const modView = isModerator();
  const showPriority = category === ALL_CATEGORY_LABEL;
  const favoriteCategoryIds = new Set(favoriteCategories.map((f) => f.categoryId));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cats, data, hiddenList, favorites, dms] = await Promise.all([
        getFeedCategoryNames({ includeFeedHidden: modView }),
        getPosts(category === ALL_CATEGORY_LABEL ? null : category, 50, {
          includeHidden: modView,
        }),
        modView ? getFeedHiddenTopics() : Promise.resolve([]),
        showPriority ? getFavoriteCategories() : Promise.resolve([]),
        showPriority ? getRecentDmRooms(FEED_DM_STRIP_LIMIT) : Promise.resolve([]),
      ]);
      setCategories(cats);
      setHiddenTopics(new Set(hiddenList.map((t) => t.name.toLowerCase())));
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

  async function handleToggleFavoriteTopic(name: string) {
    const categoryId = normalizeCategoryName(name);
    setTogglingFavoriteId(categoryId);
    setError("");
    try {
      await toggleFavoriteCategory(categoryId, name);
      const favs = await getFavoriteCategories();
      setFavoriteCategories(favs);
      const favoriteNames = new Set(favs.map((f) => f.name.toLowerCase()));
      const combined = Array.from(
        new Map([...favoritePosts, ...allPosts].map((p) => [p.id, p])).values()
      );
      const { favoritePosts: fav, allPosts: rest } = partitionFeedPosts(combined, favoriteNames);
      setFavoritePosts(fav);
      setAllPosts(rest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update favorite community");
    } finally {
      setTogglingFavoriteId(null);
    }
  }

  const hasPosts = favoritePosts.length > 0 || allPosts.length > 0;

  function renderPostList(posts: Post[], priorityLabel?: string) {
    return posts.map((post) => (
      <PostCard
        key={post.id}
        post={post}
        canModerate={modView}
        togglingVisibility={togglingPostId === post.id}
        onToggleFeedVisibility={modView ? handleToggleFeedVisibility : undefined}
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

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const topicHidden =
            modView && cat !== ALL_CATEGORY_LABEL && hiddenTopics.has(cat.toLowerCase());
          const isTopic = cat !== ALL_CATEGORY_LABEL;
          const categoryId = isTopic ? normalizeCategoryName(cat) : "";
          const isFavorite = isTopic && favoriteCategoryIds.has(categoryId);
          return (
            <div
              key={cat}
              className={`flex items-center gap-0.5 rounded-full pr-0.5 ${
                category === cat ? "codex-chip-active" : ""
              }`}
            >
              <button
                onClick={() => setCategory(cat)}
                className={`rounded-full px-3 py-1 text-sm ${
                  category === cat
                    ? ""
                    : topicHidden
                      ? "border border-orange-400/40 bg-orange-500/10 text-orange-100 hover:text-orange-50"
                      : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {isFavorite && isTopic ? "★ " : ""}
                {cat}
                {topicHidden && (
                  <span className="ml-1 text-[10px] opacity-80">(hidden)</span>
                )}
              </button>
              {isTopic && (
                <FavoriteStar
                  size="sm"
                  favorited={isFavorite}
                  disabled={togglingFavoriteId === categoryId}
                  label={`${isFavorite ? "Unpin" : "Pin"} ${cat} on your feed`}
                  onToggle={() => handleToggleFavoriteTopic(cat)}
                />
              )}
            </div>
          );
        })}
      </div>

      {showPriority && categories.length > 1 && favoriteCategories.length === 0 && (
        <p className="codex-text-muted rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
          Pin up to {MAX_FAVORITE_CATEGORIES} topics with the ★ on any category chip (or on{" "}
          <Link href="/profile" className="text-[var(--color-accent)] hover:underline">
            your profile
          </Link>
          ) — their posts appear first under &ldquo;From your communities.&rdquo;
        </p>
      )}

      {modView && (
        <p className="codex-text-muted text-sm">
          Moderator view: hidden posts and topics stay visible here with orange markers so you can
          unhide them. Members will not see hidden posts or topics in the feed.
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
                  <DmStripCard key={room.id} room={room} />
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
              {renderPostList(allPosts)}
            </section>
          )}
        </>
      )}
    </div>
  );
}
