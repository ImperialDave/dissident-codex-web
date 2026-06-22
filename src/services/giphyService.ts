import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "@/lib/firebase";

export interface GifResult {
  id: string;
  previewUrl: string;
  fullUrl: string;
}

function parseGifResults(data: unknown): GifResult[] {
  if (!data || typeof data !== "object") return [];
  const record = data as { items?: GifResult[]; gifs?: GifResult[] };
  const raw = record.items ?? record.gifs ?? [];
  return raw
    .filter((gif) => gif?.id && gif?.fullUrl)
    .map((gif) => ({
      id: gif.id,
      fullUrl: normalizeGifUrl(gif.fullUrl),
      previewUrl: normalizeGifUrl(gif.previewUrl || gif.fullUrl),
    }));
}

function normalizeGifUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed;
}

export async function searchGiphy(query: string, limit = 24): Promise<GifResult[]> {
  const fn = httpsCallable(getFirebaseFunctions(), "searchGiphy");
  const result = await fn({ query, limit });
  return parseGifResults(result.data);
}
