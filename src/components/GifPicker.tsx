"use client";

import { useCallback, useEffect, useState } from "react";
import { sanitizeUserError } from "@/lib/sanitizeError";
import { searchGiphy, type GifResult } from "@/services/giphyService";

interface GifPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (gif: GifResult) => void;
}

export function GifPicker({ open, onClose, onSelect }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runSearch = useCallback(async (term: string) => {
    setLoading(true);
    setError("");
    try {
      setGifs(await searchGiphy(term.trim()));
    } catch (err) {
      setError(sanitizeUserError(err, "GIF search failed. Try again."));
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setGifs([]);
    setError("");
    runSearch("");
  }, [open, runSearch]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) return;
    const timer = window.setTimeout(() => runSearch(trimmed), 350);
    return () => window.clearTimeout(timer);
  }, [open, query, runSearch]);

  if (!open) return null;

  return (
    <div className="codex-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="codex-modal max-w-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gif-picker-title"
      >
        <div className="codex-modal-header">
          <h2 id="gif-picker-title" className="font-semibold text-[var(--color-on-surface)]">
            Choose a GIF
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="codex-btn-ghost rounded-lg px-2 py-1 text-sm"
          >
            Close
          </button>
        </div>

        <form
          className="border-b border-[var(--color-border)] p-4"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
        >
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Giphy..."
              className="codex-input flex-1 rounded-lg px-4 py-2"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading}
              className="codex-btn-accent rounded-lg px-4 py-2"
            >
              {loading ? "..." : "Search"}
            </button>
          </div>
        </form>

        <div className="max-h-[50vh] overflow-y-auto p-4">
          {loading && <p className="codex-text-muted text-sm">Loading GIFs...</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!loading && !error && gifs.length === 0 && (
            <p className="codex-text-muted text-sm">
              {query.trim() ? "No GIFs found. Try another search." : "No trending GIFs available."}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => {
                  onSelect(gif);
                  onClose();
                }}
                className="codex-surface overflow-hidden rounded-lg transition hover:border-[var(--color-accent)]"
              >
                <img src={gif.previewUrl} alt="" className="h-28 w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}