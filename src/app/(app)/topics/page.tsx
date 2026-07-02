"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CommunityRoomRow } from "@/components/CommunityRoomRow";
import { FavoriteStar } from "@/components/FavoriteStar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { MAX_FAVORITE_CATEGORIES, TOPICS_TRENDING_LIMIT } from "@/lib/constants";
import { mapFirestoreError, normalizeCategoryName, sanitizeUserError } from "@/lib/utils";
import {
  ensureTopicChatRoom,
  getCreateCategoryNames,
  getFavoriteCategories,
  getRankedTopicCommunities,
  searchTopics,
  toggleFavoriteCategory,
} from "@/services/categoryService";
import type { LeaderboardEntry } from "@/models";

export default function TopicsPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteNames, setFavoriteNames] = useState<Set<string>>(new Set());
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);
  const [trending, setTrending] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    getRankedTopicCommunities(TOPICS_TRENDING_LIMIT, "chat").then(setTrending).catch(() => setTrending([]));
  }, []);

  useEffect(() => {
    Promise.all([getCreateCategoryNames(), getFavoriteCategories()])
      .then(([names, favs]) => {
        setTopics(names);
        setFavoriteIds(new Set(favs.map((f) => f.categoryId)));
        setFavoriteNames(new Set(favs.map((f) => f.name.toLowerCase())));
      })
      .catch((err) => {
        setTopics([]);
        setError(err instanceof Error ? mapFirestoreError(err.message) : "Failed to load topics");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return topics;
    return topics.filter((name) => name.toLowerCase().includes(needle));
  }, [topics, query]);

  async function handleSearch() {
    const q = query.trim();
    if (!q) {
      setLoading(true);
      setError("");
      try {
        setTopics(await getCreateCategoryNames());
      } catch (err) {
        setError(err instanceof Error ? mapFirestoreError(err.message) : "Failed to load topics");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError("");
    try {
      const results = await searchTopics(q, 50);
      setTopics(results.map((t) => t.name));
    } catch (err) {
      setTopics([]);
      setError(err instanceof Error ? mapFirestoreError(err.message) : "Failed to search topics");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Topics" />
      <p className="border-b border-[var(--color-border)] px-4 py-2 text-sm codex-text-muted">
        Pin up to {MAX_FAVORITE_CATEGORIES} favorites — they show first on your feed.
      </p>

      <div className="flex gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search topics"
          className="flex-1"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="codex-btn-accent shrink-0 rounded-full px-4 py-2 disabled:opacity-50"
        >
          Go
        </button>
      </div>

      {error && (
        <div className="border-b border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {trending.length > 0 && (
        <div className="border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide codex-text-muted">
              Trending communities
            </p>
            <Link href="/chats" className="text-xs text-[var(--color-accent)] hover:underline">
              See all
            </Link>
          </div>
          {trending.map((entry) => (
            <CommunityRoomRow key={entry.roomId} entry={entry} />
          ))}
        </div>
      )}

      {loading ? (
        <p className="px-4 py-8 text-center codex-text-muted">Loading topics...</p>
      ) : (
        <div>
          {filtered.map((name) => (
            <div key={name} className="codex-list-row">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{name}</p>
                <FavoriteStar
                  size="sm"
                  favorited={
                    favoriteIds.has(normalizeCategoryName(name)) ||
                    favoriteNames.has(name.toLowerCase())
                  }
                  disabled={togglingFavorite === name}
                  label={`${
                    favoriteIds.has(normalizeCategoryName(name)) ||
                    favoriteNames.has(name.toLowerCase())
                      ? "Unpin"
                      : "Pin"
                  } ${name} on your feed`}
                  onToggle={async () => {
                    setTogglingFavorite(name);
                    setError("");
                    try {
                      const categoryId = normalizeCategoryName(name);
                      const favsBefore = await getFavoriteCategories();
                      const existing = favsBefore.find(
                        (f) =>
                          f.categoryId === categoryId ||
                          f.name.toLowerCase() === name.toLowerCase()
                      );
                      const idToToggle = existing?.categoryId ?? categoryId;
                      await toggleFavoriteCategory(idToToggle, name);
                      const favs = await getFavoriteCategories();
                      setFavoriteIds(new Set(favs.map((f) => f.categoryId)));
                      setFavoriteNames(new Set(favs.map((f) => f.name.toLowerCase())));
                    } catch (err) {
                      setError(
                        sanitizeUserError(err, "Failed to update favorite community")
                      );
                    } finally {
                      setTogglingFavorite(null);
                    }
                  }}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  disabled={opening === name}
                  onClick={async () => {
                    setOpening(name);
                    setError("");
                    try {
                      const room = await ensureTopicChatRoom(name);
                      router.push(`/chat/${room.id}`);
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? mapFirestoreError(err.message)
                          : "Failed to open topic chat"
                      );
                    } finally {
                      setOpening(null);
                    }
                  }}
                  className="codex-btn-accent rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  {opening === name ? "Opening..." : "Open chat"}
                </button>
                <Link
                  href={`/feed?category=${encodeURIComponent(name)}`}
                  className="codex-btn-ghost rounded-lg px-3 py-1.5 text-sm"
                >
                  View posts
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && !error && (
        <p className="px-4 py-8 text-center codex-text-muted">No topics found.</p>
      )}
    </div>
  );
}
