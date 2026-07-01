import { getBookById } from "./books";
import { loadBook } from "./loadBook";
import type { BiblePassage, BibleReference, BibleVerse } from "./types";

function formatLabel(reference: BibleReference): string {
  const { bookName, startChapter, startVerse, endChapter, endVerse, verseList } = reference;

  if (verseList && verseList.length > 1) {
    return `${bookName} ${startChapter}:${verseList.join(",")}`;
  }

  if (startChapter === endChapter && startVerse === endVerse) {
    return `${bookName} ${startChapter}:${startVerse}`;
  }

  if (startChapter === endChapter) {
    return `${bookName} ${startChapter}:${startVerse}–${endVerse}`;
  }

  return `${bookName} ${startChapter}:${startVerse}–${endChapter}:${endVerse}`;
}

function getVerseText(
  chapters: Record<string, Record<string, string>>,
  chapter: number,
  verse: number
): string | null {
  return chapters[String(chapter)]?.[String(verse)] ?? null;
}

function enumerateVerses(reference: BibleReference, chapters: Record<string, Record<string, string>>): BibleVerse[] {
  const book = getBookById(reference.bookId);
  if (!book) return [];

  const verses: BibleVerse[] = [];

  if (reference.verseList) {
    for (const verse of reference.verseList) {
      const text = getVerseText(chapters, reference.startChapter, verse);
      if (!text) return [];
      verses.push({
        bookId: reference.bookId,
        bookName: book.name,
        chapter: reference.startChapter,
        verse,
        text,
      });
    }
    return verses;
  }

  for (let chapter = reference.startChapter; chapter <= reference.endChapter; chapter += 1) {
    const chapterMap = chapters[String(chapter)];
    if (!chapterMap) return [];

    const verseNumbers = Object.keys(chapterMap)
      .map((v) => Number.parseInt(v, 10))
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b);

    for (const verse of verseNumbers) {
      const inRange =
        chapter > reference.startChapter && chapter < reference.endChapter
          ? true
          : chapter === reference.startChapter && chapter === reference.endChapter
            ? verse >= reference.startVerse && verse <= reference.endVerse
            : chapter === reference.startChapter
              ? verse >= reference.startVerse
              : verse <= reference.endVerse;

      if (!inRange) continue;

      const text = chapterMap[String(verse)];
      if (!text) return [];

      verses.push({
        bookId: reference.bookId,
        bookName: book.name,
        chapter,
        verse,
        text,
      });
    }
  }

  return verses;
}

export async function resolvePassage(reference: BibleReference): Promise<BiblePassage | null> {
  const book = await loadBook(reference.bookId);
  if (!book) return null;

  const verses = enumerateVerses(reference, book.chapters);
  if (verses.length === 0) return null;

  return {
    label: formatLabel(reference),
    reference,
    verses,
  };
}