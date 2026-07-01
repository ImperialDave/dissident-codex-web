export interface BibleVerse {
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleReference {
  raw: string;
  bookId: string;
  bookName: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
  /** Individual verses when non-contiguous, e.g. 16,18 */
  verseList?: number[];
}

export interface BiblePassage {
  label: string;
  reference: BibleReference;
  verses: BibleVerse[];
}

export interface BibleBookFile {
  id: string;
  name: string;
  translation: "web";
  chapters: Record<string, Record<string, string>>;
}

export type TextSegment =
  | { type: "text"; value: string }
  | { type: "reference"; value: string; reference: BibleReference };