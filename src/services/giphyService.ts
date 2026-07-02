import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "@/lib/firebase";
import { sanitizeUserErrorMessage } from "@/lib/sanitizeError";

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

async function searchGiphyApi(query: string, limit: number): Promise<GifResult[]> {
  const params = new URLSearchParams({
    query,
    limit: String(limit),
  });
  const response = await fetch(`/api/giphy?${params.toString()}`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof body?.error === "string"
        ? body.error
        : "GIF search is temporarily unavailable.";
    throw new Error(sanitizeUserErrorMessage(message, "GIF search failed. Try again."));
  }

  return parseGifResults(body);
}

async function searchGiphyCloud(query: string, limit: number): Promise<GifResult[]> {
  const fn = httpsCallable(getFirebaseFunctions(), "searchGiphy");
  const result = await fn({ query, limit });
  return parseGifResults(result.data);
}

export async function searchGiphy(query: string, limit = 24): Promise<GifResult[]> {
  const bounded = Math.min(Math.max(limit, 1), 50);

  try {
    return await searchGiphyApi(query, bounded);
  } catch (apiErr) {
    try {
      return await searchGiphyCloud(query, bounded);
    } catch (cloudErr) {
      const apiMessage = sanitizeUserErrorMessage(
        apiErr instanceof Error ? apiErr.message : "GIF search failed",
        "GIF search failed. Try again."
      );
      const cloudMessage = sanitizeUserErrorMessage(
        cloudErr instanceof Error ? cloudErr.message : "GIF search failed",
        "GIF search failed. Try again."
      );
      if (cloudMessage.includes("not available") || cloudMessage.includes("not found")) {
        throw new Error(apiMessage);
      }
      throw new Error(apiMessage || cloudMessage);
    }
  }
}