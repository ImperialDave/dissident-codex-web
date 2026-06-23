import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "@/lib/firebase";

export interface GifResult {
  id: string;
  previewUrl: string;
  fullUrl: string;
}

const GIPHY_BASE = "https://api.giphy.com/v1/gifs";

function parseGiphyPayload(data: unknown): GifResult[] {
  if (!data || typeof data !== "object") return [];
  const record = data as {
    items?: GifResult[];
    gifs?: GifResult[];
    data?: Array<{
      id?: string;
      images?: Record<string, { url?: string }>;
    }>;
  };

  if (record.items?.length || record.gifs?.length) {
    const raw = record.items ?? record.gifs ?? [];
    return raw
      .filter((gif) => gif?.id && gif?.fullUrl)
      .map((gif) => ({
        id: gif.id,
        fullUrl: normalizeGifUrl(gif.fullUrl),
        previewUrl: normalizeGifUrl(gif.previewUrl || gif.fullUrl),
      }));
  }

  const rows = record.data ?? [];
  return rows
    .map((obj) => {
      const images = obj.images ?? {};
      const fixed = images.fixed_height ?? images.downsized ?? {};
      const preview = images.preview_gif ?? images.fixed_height_small ?? fixed;
      const fullUrl = fixed.url ?? "";
      const previewUrl = preview.url ?? fullUrl;
      return {
        id: obj.id ?? "",
        fullUrl: normalizeGifUrl(fullUrl),
        previewUrl: normalizeGifUrl(previewUrl),
      };
    })
    .filter((gif) => gif.id && gif.fullUrl);
}

function normalizeGifUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed;
}

function publicApiKey(): string | null {
  const key = process.env.NEXT_PUBLIC_GIPHY_API_KEY?.trim();
  return key || null;
}

async function searchGiphyDirect(query: string, limit: number): Promise<GifResult[]> {
  const apiKey = publicApiKey();
  if (!apiKey) {
    throw new Error("GIF search is not configured. Add NEXT_PUBLIC_GIPHY_API_KEY on Railway.");
  }

  const term = query.trim();
  const endpoint = term
    ? `${GIPHY_BASE}/search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(term)}&limit=${limit}&rating=pg-13`
    : `${GIPHY_BASE}/trending?api_key=${encodeURIComponent(apiKey)}&limit=${limit}&rating=pg-13`;

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Giphy API error (${response.status})`);
  }

  const body = await response.json();
  return parseGiphyPayload(body);
}

async function searchGiphyCloud(query: string, limit: number): Promise<GifResult[]> {
  const fn = httpsCallable(getFirebaseFunctions(), "searchGiphy");
  const result = await fn({ query, limit });
  return parseGiphyPayload(result.data);
}

export async function searchGiphy(query: string, limit = 24): Promise<GifResult[]> {
  const bounded = Math.min(Math.max(limit, 1), 50);

  if (publicApiKey()) {
    try {
      return await searchGiphyDirect(query, bounded);
    } catch (directErr) {
      try {
        return await searchGiphyCloud(query, bounded);
      } catch {
        throw directErr;
      }
    }
  }

  try {
    return await searchGiphyCloud(query, bounded);
  } catch (cloudErr) {
    const message =
      cloudErr instanceof Error ? cloudErr.message : "GIF search failed";
    if (message.includes("not-found") || message.includes("404")) {
      throw new Error(
        "GIF search is not configured. Add NEXT_PUBLIC_GIPHY_API_KEY on Railway or deploy the searchGiphy Cloud Function."
      );
    }
    throw cloudErr instanceof Error ? cloudErr : new Error(message);
  }
}