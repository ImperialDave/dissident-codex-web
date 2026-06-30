import { containsGifUrl, resolveMediaType } from "@/lib/utils";

export function isGifMedia(
  mediaType?: string | null,
  url?: string | null
): boolean {
  return resolveMediaType(mediaType, url)?.toLowerCase() === "gif";
}

export function isGifUrl(url?: string | null): boolean {
  if (!url?.trim()) return false;
  return containsGifUrl(url);
}
