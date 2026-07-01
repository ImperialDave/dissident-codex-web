import { getBookById, getBookMatchTokens, resolveBookId } from "./books";
import type { BibleReference, TextSegment } from "./types";

const MAX_VERSES_PER_POST = 30;

function parseVerseSpec(spec: string): { start: number; end: number; list?: number[] } | null {
  const trimmed = spec.trim();
  if (!trimmed) return null;

  if (trimmed.includes(",")) {
    const parts = trimmed.split(",").map((p) => Number.parseInt(p.trim(), 10));
    if (parts.some((n) => Number.isNaN(n) || n < 1)) return null;
    return { start: parts[0]!, end: parts[parts.length - 1]!, list: parts };
  }

  const range = trimmed.match(/^(\d+)\s*-\s*(?:(\d+)\s*:\s*)?(\d+)$/);
  if (range) {
    const start = Number.parseInt(range[1]!, 10);
    const endChapter = range[2] ? Number.parseInt(range[2], 10) : undefined;
    const endVerse = Number.parseInt(range[3]!, 10);
    if (Number.isNaN(start) || Number.isNaN(endVerse) || start < 1 || endVerse < 1) return null;
    return { start, end: endVerse, list: endChapter ? undefined : undefined };
  }

  const single = Number.parseInt(trimmed, 10);
  if (Number.isNaN(single) || single < 1) return null;
  return { start: single, end: single };
}

function parseRangePart(
  chapter: number,
  verseSpec: string,
  endChapterFromRange?: number
): Pick<BibleReference, "startVerse" | "endVerse" | "endChapter" | "verseList"> | null {
  const crossChapter = verseSpec.match(/^(\d+)\s*-\s*(\d+)\s*:\s*(\d+)$/);
  if (crossChapter) {
    const startVerse = Number.parseInt(crossChapter[1]!, 10);
    const endChapter = Number.parseInt(crossChapter[2]!, 10);
    const endVerse = Number.parseInt(crossChapter[3]!, 10);
    if ([startVerse, endChapter, endVerse].some((n) => Number.isNaN(n) || n < 1)) return null;
    return { startVerse, endChapter, endVerse };
  }

  const parsed = parseVerseSpec(verseSpec);
  if (!parsed) return null;

  return {
    startVerse: parsed.start,
    endVerse: parsed.end,
    endChapter: endChapterFromRange ?? chapter,
    verseList: parsed.list,
  };
}

export function parseReferenceString(raw: string): BibleReference | null {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  const match = trimmed.match(/^(.+?)\s+(\d+)\s*:\s*(.+)$/);
  if (!match) return null;

  const bookId = resolveBookId(match[1]!.trim());
  if (!bookId) return null;

  const book = getBookById(bookId);
  if (!book) return null;

  const chapter = Number.parseInt(match[2]!, 10);
  if (Number.isNaN(chapter) || chapter < 1 || chapter > book.chapters) return null;

  const range = parseRangePart(chapter, match[3]!.trim());
  if (!range) return null;

  if (range.endChapter < chapter) return null;

  return {
    raw: trimmed,
    bookId,
    bookName: book.name,
    startChapter: chapter,
    startVerse: range.startVerse,
    endChapter: range.endChapter,
    endVerse: range.endVerse,
    verseList: range.verseList,
  };
}

function isBoundary(text: string, index: number): boolean {
  if (index <= 0) return true;
  const prev = text[index - 1]!;
  return /[\s;(]/.test(prev);
}

function tryMatchAt(text: string, start: number): { reference: BibleReference; end: number } | null {
  const slice = text.slice(start);

  for (const token of getBookMatchTokens()) {
    const pattern = new RegExp(
      `^${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+\\d+\\s*:\\s*[\\d,\\s:-]+`,
      "i"
    );
    const match = slice.match(pattern);
    if (!match) continue;

    const reference = parseReferenceString(match[0]!);
    if (reference) {
      return { reference, end: start + match[0].length };
    }
  }

  return null;
}

export function findReferencesInText(text: string): Array<{ reference: BibleReference; start: number; end: number }> {
  const found: Array<{ reference: BibleReference; start: number; end: number }> = [];
  const clauses = text.split(";");
  let offset = 0;

  for (let clauseIndex = 0; clauseIndex < clauses.length; clauseIndex += 1) {
    const clause = clauses[clauseIndex]!;
    let local = 0;

    while (local < clause.length) {
      if (/\s/.test(clause[local]!)) {
        local += 1;
        continue;
      }

      if (!isBoundary(clause, local) && local > 0) {
        local += 1;
        continue;
      }

      const hit = tryMatchAt(clause, local);
      if (hit) {
        found.push({
          reference: hit.reference,
          start: offset + local,
          end: offset + hit.end,
        });
        local = hit.end;
        continue;
      }
      local += 1;
    }

    offset += clause.length + (clauseIndex < clauses.length - 1 ? 1 : 0);
  }

  return dedupeOverlapping(found);
}

function dedupeOverlapping(
  items: Array<{ reference: BibleReference; start: number; end: number }>
): Array<{ reference: BibleReference; start: number; end: number }> {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: typeof sorted = [];

  for (const item of sorted) {
    if (kept.some((k) => item.start >= k.start && item.end <= k.end)) continue;
    kept.push(item);
  }

  return kept.sort((a, b) => a.start - b.start);
}

export function segmentTextWithReferences(text: string): TextSegment[] {
  const refs = findReferencesInText(text);
  if (refs.length === 0) return [{ type: "text", value: text }];

  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const ref of refs) {
    if (ref.start > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, ref.start) });
    }
    segments.push({ type: "reference", value: text.slice(ref.start, ref.end), reference: ref.reference });
    cursor = ref.end;
  }

  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor) });
  }

  return segments;
}

export function countVersesInReference(reference: BibleReference): number {
  if (reference.verseList) return reference.verseList.length;

  if (reference.startChapter === reference.endChapter) {
    return reference.endVerse - reference.startVerse + 1;
  }

  let count = 0;
  const book = getBookById(reference.bookId);
  if (!book) return 0;

  for (let ch = reference.startChapter; ch <= reference.endChapter; ch += 1) {
    const chapterVerses = book.chapters;
    const maxVerse = 176;
    if (ch === reference.startChapter && ch === reference.endChapter) {
      count += reference.endVerse - reference.startVerse + 1;
    } else if (ch === reference.startChapter) {
      count += maxVerse - reference.startVerse + 1;
    } else if (ch === reference.endChapter) {
      count += reference.endVerse;
    } else {
      count += maxVerse;
    }
  }
  return count;
}

export function applyVerseBudget(
  references: BibleReference[]
): Array<{ reference: BibleReference; expandable: boolean }> {
  let used = 0;
  return references.map((reference) => {
    const count = countVersesInReference(reference);
    if (used + count > MAX_VERSES_PER_POST) {
      return { reference, expandable: false };
    }
    used += count;
    return { reference, expandable: true };
  });
}

export { MAX_VERSES_PER_POST };