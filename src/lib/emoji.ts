export const DEFAULT_REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "👀"] as const;

const EMOJI_SEGMENTER =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

export function splitGraphemes(value: string): string[] {
  if (!value) return [];
  if (EMOJI_SEGMENTER) {
    return Array.from(EMOJI_SEGMENTER.segment(value), (part) => part.segment);
  }
  return Array.from(value);
}

/** First grapheme cluster — used for reaction keys and picker selection. */
export function normalizeEmoji(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return splitGraphemes(trimmed)[0] ?? "";
}

export function emojiKey(emoji: string): string {
  const normalized = normalizeEmoji(emoji);
  if (!normalized) return "";
  return Array.from(new TextEncoder().encode(normalized))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function reactionDocId(userId: string, emoji: string): string {
  return `${userId}_${emojiKey(emoji)}`;
}

export function isValidEmoji(value: string): boolean {
  const normalized = normalizeEmoji(value);
  if (!normalized || normalized.length > 8) return false;
  if (/[\u0000-\u001f\u007f]/.test(normalized)) return false;
  try {
    encodeURIComponent(normalized);
  } catch {
    return false;
  }
  return true;
}

export function resolveQuickEmojis(
  recent: string[],
  usageCounts: Record<string, number>,
  limit = 5
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  const add = (emoji: string) => {
    const normalized = normalizeEmoji(emoji);
    if (!normalized || !isValidEmoji(normalized) || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  };

  for (const emoji of recent) {
    if (result.length >= limit) break;
    add(emoji);
  }

  if (result.length < limit) {
    const topUsed = Object.entries(usageCounts)
      .filter(([emoji]) => isValidEmoji(emoji))
      .sort((a, b) => b[1] - a[1])
      .map(([emoji]) => emoji);
    for (const emoji of topUsed) {
      if (result.length >= limit) break;
      add(emoji);
    }
  }

  for (const emoji of DEFAULT_REACTION_EMOJIS) {
    if (result.length >= limit) break;
    add(emoji);
  }

  return result;
}

export function sortedReactionEntries(
  summary: Record<string, number> | undefined | null
): [string, number][] {
  if (!summary) return [];
  return Object.entries(summary)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
