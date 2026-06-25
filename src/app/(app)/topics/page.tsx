"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FavoriteStar } from "@/components/FavoriteStar";
import { MAX_FAVORITE_CATEGORIES } from "@/lib/constants";
import { mapFirestoreError, normalizeCategoryName } from "@/lib/utils";
import {
  ensureTopicChatRoom,
  getCreateCategoryNames,
  getFavoriteCategories,
  searchTopics,
  toggleFavoriteCategory,
} from "@/services/categoryService";

export default function TopicsPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCreateCategoryNames(), getFavoriteCategories()])
      .then(([names, favs]) => {
        setTopics(names);
        setFavoriteIds(new Set(favs.map((f) => f.categoryId)));
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
    <div className="space-y-4">
      <div className="codex-page-header">
        <h1 className="codex-page-title">Browse Topics</h1>
        <p className="codex-text-muted text-sm">
          Pin up to {MAX_FAVORITE_CATEGORIES} favorites — they show first on your feed.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search topics..."
          className="codex-input flex-1 rounded-lg px-4 py-2"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="codex-btn-accent rounded-lg px-4 py-2 disabled:opacity-50"
        >
          Search
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading topics...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((name) => (
            <div
              key={name}
              className="codex-surface codex-surface-hover rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{name}</p>
                <FavoriteStar
                  size="sm"
                  favorited={favoriteIds.has(normalizeCategoryName(name))}
                  disabled={togglingFavorite === name}
                  label={`${favoriteIds.has(normalizeCategoryName(name)) ? "Unpin" : "Pin"} ${name} on your feed`}
                  onToggle={async () => {
                    setTogglingFavorite(name);
                    setError("");
                    try {
                      await toggleFavoriteCategory(normalizeCategoryName(name), name);
                      const favs = await getFavoriteCategories();
                      setFavoriteIds(new Set(favs.map((f) => f.categoryId)));
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "Failed to update favorite community"
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
        <p className="text-slate-400">No topics found.</p>
      )}
    </div>
  );
}
