import type { BibleBookFile } from "./types";

const cache = new Map<string, BibleBookFile>();

export async function loadBook(bookId: string): Promise<BibleBookFile | null> {
  if (cache.has(bookId)) return cache.get(bookId)!;

  try {
    const res = await fetch(`/bible/books/${bookId}.json`);
    if (!res.ok) return null;
    const data = (await res.json()) as BibleBookFile;
    cache.set(bookId, data);
    return data;
  } catch {
    return null;
  }
}

export function clearBookCache(): void {
  cache.clear();
}