"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setGifs([]);
    setError("");
  }, [open]);

  async function runSearch(term: string) {
    const q = term.trim();
    if (!q) {
      setGifs([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setGifs(await searchGiphy(q));
    } catch (err) {
      setError(err instanceof Error ? err.message : "GIF search failed");
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="font-semibold text-white">Choose a GIF</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
          >
            Close
          </button>
        </div>

        <form
          className="border-b border-white/10 p-4"
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
              className="flex-1 rounded-lg border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-[var(--color-accent)]"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 font-semibold text-black disabled:opacity-50"
            >
              Search
            </button>
          </div>
        </form>

        <div className="max-h-[50vh] overflow-y-auto p-4">
          {loading && <p className="text-sm text-slate-400">Searching...</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!loading && !error && gifs.length === 0 && (
            <p className="text-sm text-slate-400">Search for a GIF to attach to your post.</p>
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
                className="overflow-hidden rounded-lg border border-white/10 hover:border-[var(--color-accent)]"
              >
                <img src={gif.previewUrl} alt="" className="h-28 w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}