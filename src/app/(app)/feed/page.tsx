"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Search, Star, UserPlus } from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { useDmDisplayNames } from "@/hooks/useDmDisplayNames";
import { chatRoomDisplayTitle } from "@/lib/chatDisplay";
import { ALL_CATEGORY_LABEL, FEED_DM_STRIP_LIMIT } from "@/lib/constants";
import { partitionFeedSections } from "@/lib/feedRank";
import { mapFirestoreError } from "@/lib/utils";
import { getFavoriteCategories } from "@/services/categoryService";
import { getFollowingIds } from "@/services/followService";
import { getRecentDmRooms } from "@/services/chatService";
import {
  getPosts,
  refreshSavedPostIds,
  togglePostFeedVisibility,
  toggleSavePost,
} from "@/services/postService";
import { useAuthStore } from "@/stores/authStore";
import type { ChatRoom, FavoriteCategory, Post } from "@/models";
import clsx from "clsx";

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
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [favoritePosts, setFavoritePosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [followingCount, setFollowingCount] = useState(0);
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
      const [data, favorites, dms, followingIds] = await Promise.all([
        getPosts(category === ALL_CATEGORY_LABEL ? null : category, 50, {
          includeHidden: modView,
        }),
        getFavoriteCategories(),
        showPriority ? getRecentDmRooms(FEED_DM_STRIP_LIMIT) : Promise.resolve([]),
        showPriority ? getFollowingIds() : Promise.resolve(new Set<string>()),
      ]);
      setDmRooms(dms);
      setFavoriteCategories(favorites);
      setFollowingCount(followingIds.size);

      const filtered = data.filter((p) => matchesSearch(p, search));

      if (showPriority) {
        const favoriteNames = new Set(favorites.map((f) => f.name.toLowerCase()));
        const { followingPosts: following, favoritePosts: fav, allPosts: rest } =
          partitionFeedSections(filtered, followingIds, favoriteNames);
        setFollowingPosts(following);
        setFavoritePosts(fav);
        setAllPosts(rest);
      } else {
        setFollowingPosts([]);
        setFavoritePosts([]);
        setAllPosts(filtered);
      }
    } catch (err) {
      setFollowingPosts([]);
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
      setFollowingPosts((prev) => prev.map(update));
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

  const hasPosts =
    followingPosts.length > 0 || favoritePosts.length > 0 || allPosts.length > 0;
  const tabs = [
    { id: ALL_CATEGORY_LABEL, label: "For you" },
    ...favoriteCategories.map((f) => ({ id: f.name, label: f.name })),
  ];

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
    <div>
      <PageHeader
        title="Home"
        actions={
          <div className="relative w-40 sm:w-52">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              inputSize="sm"
              className="pl-9"
            />
          </div>
        }
      />

      {tabs.length > 1 && (
        <div className="codex-tab-bar overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id)}
              className={clsx(
                "codex-tab whitespace-nowrap",
                category === tab.id && "codex-tab-active"
              )}
            >
              {tab.id !== ALL_CATEGORY_LABEL && (
                <Star className="mr-1 inline h-3 w-3 fill-current" />
              )}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {showPriority && followingCount === 0 && (
        <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm codex-text-muted">
          <UserPlus className="mr-1 inline h-4 w-4 align-text-bottom" />
          Follow people from their{" "}
          <Link href="/search" className="text-[var(--color-accent)] hover:underline">
            profile
          </Link>{" "}
          to see their posts here.
        </p>
      )}

      {showPriority && favoriteCategories.length === 0 && followingCount > 0 && (
        <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm codex-text-muted">
          Pin topics on{" "}
          <Link href="/topics" className="text-[var(--color-accent)] hover:underline">
            Topics
          </Link>{" "}
          to also filter by community.
        </p>
      )}

      {modView && (
        <p className="border-b border-[var(--color-border)] px-4 py-2 text-xs codex-text-muted">
          Moderator view: hidden posts remain visible here.
        </p>
      )}

      {error && (
        <div className="border-b border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {showPriority && dmRooms.length > 0 && (
        <Link
          href="/chats"
          className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 transition hover:bg-white/5"
        >
          <MessageCircle className="h-5 w-5 text-[var(--color-accent)]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Messages</p>
            <p className="truncate text-xs codex-text-muted">
              {dmRooms
                .slice(0, 3)
                .map((room) =>
                  user?.uid
                    ? chatRoomDisplayTitle(room, user.uid, dmDisplayNames)
                    : room.title
                )
                .join(", ")}
            </p>
          </div>
          <span className="text-xs text-[var(--color-accent)]">View all</span>
        </Link>
      )}

      {loading ? (
        <p className="px-4 py-8 text-center codex-text-muted">Loading posts...</p>
      ) : !hasPosts ? (
        <div className="px-4 py-12 text-center">
          <p className="codex-text-muted">No posts yet. Be the first to create one!</p>
          <Link
            href="/create"
            className="codex-btn-accent mt-4 inline-block rounded-full px-6 py-2.5"
          >
            Create post
          </Link>
        </div>
      ) : (
        <div>
          {showPriority && followingPosts.length > 0 && (
            <>
              <p className="border-b border-[var(--color-border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide codex-text-muted">
                From people you follow
              </p>
              {renderPostList(followingPosts, "Following")}
            </>
          )}
          {showPriority && favoritePosts.length > 0 && (
            <>
              <p className="border-b border-[var(--color-border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide codex-text-muted">
                From your communities
              </p>
              {renderPostList(favoritePosts, "Community")}
            </>
          )}
          {showPriority &&
            (followingPosts.length > 0 || favoritePosts.length > 0) &&
            allPosts.length > 0 && (
            <p className="border-b border-[var(--color-border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide codex-text-muted">
              All posts
            </p>
          )}
          {!showPriority && allPosts.length > 0 && (
            <p className="border-b border-[var(--color-border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide codex-text-muted">
              {category}
            </p>
          )}
          {renderPostList(allPosts)}
        </div>
      )}
    </div>
  );
}