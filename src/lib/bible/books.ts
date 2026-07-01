export interface BibleBookMeta {
  id: string;
  name: string;
  chapters: number;
}

export const BIBLE_BOOKS: BibleBookMeta[] = [
  { id: "genesis", name: "Genesis", chapters: 50 },
  { id: "exodus", name: "Exodus", chapters: 40 },
  { id: "leviticus", name: "Leviticus", chapters: 27 },
  { id: "numbers", name: "Numbers", chapters: 36 },
  { id: "deuteronomy", name: "Deuteronomy", chapters: 34 },
  { id: "joshua", name: "Joshua", chapters: 24 },
  { id: "judges", name: "Judges", chapters: 21 },
  { id: "ruth", name: "Ruth", chapters: 4 },
  { id: "1samuel", name: "1 Samuel", chapters: 31 },
  { id: "2samuel", name: "2 Samuel", chapters: 24 },
  { id: "1kings", name: "1 Kings", chapters: 22 },
  { id: "2kings", name: "2 Kings", chapters: 25 },
  { id: "1chronicles", name: "1 Chronicles", chapters: 29 },
  { id: "2chronicles", name: "2 Chronicles", chapters: 36 },
  { id: "ezra", name: "Ezra", chapters: 10 },
  { id: "nehemiah", name: "Nehemiah", chapters: 13 },
  { id: "esther", name: "Esther", chapters: 10 },
  { id: "job", name: "Job", chapters: 42 },
  { id: "psalms", name: "Psalms", chapters: 150 },
  { id: "proverbs", name: "Proverbs", chapters: 31 },
  { id: "ecclesiastes", name: "Ecclesiastes", chapters: 12 },
  { id: "songofsolomon", name: "Song of Solomon", chapters: 8 },
  { id: "isaiah", name: "Isaiah", chapters: 66 },
  { id: "jeremiah", name: "Jeremiah", chapters: 52 },
  { id: "lamentations", name: "Lamentations", chapters: 5 },
  { id: "ezekiel", name: "Ezekiel", chapters: 48 },
  { id: "daniel", name: "Daniel", chapters: 12 },
  { id: "hosea", name: "Hosea", chapters: 14 },
  { id: "joel", name: "Joel", chapters: 3 },
  { id: "amos", name: "Amos", chapters: 9 },
  { id: "obadiah", name: "Obadiah", chapters: 1 },
  { id: "jonah", name: "Jonah", chapters: 4 },
  { id: "micah", name: "Micah", chapters: 7 },
  { id: "nahum", name: "Nahum", chapters: 3 },
  { id: "habakkuk", name: "Habakkuk", chapters: 3 },
  { id: "zephaniah", name: "Zephaniah", chapters: 3 },
  { id: "haggai", name: "Haggai", chapters: 2 },
  { id: "zechariah", name: "Zechariah", chapters: 14 },
  { id: "malachi", name: "Malachi", chapters: 4 },
  { id: "matthew", name: "Matthew", chapters: 28 },
  { id: "mark", name: "Mark", chapters: 16 },
  { id: "luke", name: "Luke", chapters: 24 },
  { id: "john", name: "John", chapters: 21 },
  { id: "acts", name: "Acts", chapters: 28 },
  { id: "romans", name: "Romans", chapters: 16 },
  { id: "1corinthians", name: "1 Corinthians", chapters: 16 },
  { id: "2corinthians", name: "2 Corinthians", chapters: 13 },
  { id: "galatians", name: "Galatians", chapters: 6 },
  { id: "ephesians", name: "Ephesians", chapters: 6 },
  { id: "philippians", name: "Philippians", chapters: 4 },
  { id: "colossians", name: "Colossians", chapters: 4 },
  { id: "1thessalonians", name: "1 Thessalonians", chapters: 5 },
  { id: "2thessalonians", name: "2 Thessalonians", chapters: 3 },
  { id: "1timothy", name: "1 Timothy", chapters: 6 },
  { id: "2timothy", name: "2 Timothy", chapters: 4 },
  { id: "titus", name: "Titus", chapters: 3 },
  { id: "philemon", name: "Philemon", chapters: 1 },
  { id: "hebrews", name: "Hebrews", chapters: 13 },
  { id: "james", name: "James", chapters: 5 },
  { id: "1peter", name: "1 Peter", chapters: 5 },
  { id: "2peter", name: "2 Peter", chapters: 3 },
  { id: "1john", name: "1 John", chapters: 5 },
  { id: "2john", name: "2 John", chapters: 1 },
  { id: "3john", name: "3 John", chapters: 1 },
  { id: "jude", name: "Jude", chapters: 1 },
  { id: "revelation", name: "Revelation", chapters: 22 },
];

const ALIASES: Record<string, string> = {
  gen: "genesis",
  gn: "genesis",
  ex: "exodus",
  exod: "exodus",
  lev: "leviticus",
  num: "numbers",
  nu: "numbers",
  deut: "deuteronomy",
  dt: "deuteronomy",
  josh: "joshua",
  jdg: "judges",
  judg: "judges",
  ps: "psalms",
  psa: "psalms",
  psalm: "psalms",
  prov: "proverbs",
  pr: "proverbs",
  eccl: "ecclesiastes",
  ecc: "ecclesiastes",
  song: "songofsolomon",
  sos: "songofsolomon",
  isa: "isaiah",
  jer: "jeremiah",
  lam: "lamentations",
  ezek: "ezekiel",
  eze: "ezekiel",
  dan: "daniel",
  matt: "matthew",
  mt: "matthew",
  mk: "mark",
  mar: "mark",
  lk: "luke",
  luk: "luke",
  jn: "john",
  joh: "john",
  act: "acts",
  rom: "romans",
  "1co": "1corinthians",
  "1cor": "1corinthians",
  "2co": "2corinthians",
  "2cor": "2corinthians",
  gal: "galatians",
  eph: "ephesians",
  phil: "philippians",
  php: "philippians",
  col: "colossians",
  "1thess": "1thessalonians",
  "1th": "1thessalonians",
  "2thess": "2thessalonians",
  "2th": "2thessalonians",
  "1tim": "1timothy",
  "1ti": "1timothy",
  "2tim": "2timothy",
  "2ti": "2timothy",
  tit: "titus",
  phm: "philemon",
  phlm: "philemon",
  heb: "hebrews",
  jas: "james",
  jam: "james",
  "1pet": "1peter",
  "1pe": "1peter",
  "2pet": "2peter",
  "2pe": "2peter",
  "1jn": "1john",
  "1joh": "1john",
  "2jn": "2john",
  "2joh": "2john",
  "3jn": "3john",
  "3joh": "3john",
  rev: "revelation",
  re: "revelation",
};

const bookById = new Map(BIBLE_BOOKS.map((b) => [b.id, b]));

export function getBookById(id: string): BibleBookMeta | undefined {
  return bookById.get(id);
}

function normalizeBookKey(raw: string): string {
  return raw.toLowerCase().replace(/\./g, "").replace(/\s+/g, "");
}

export function resolveBookId(rawBook: string): string | null {
  const trimmed = rawBook.trim();
  if (!trimmed) return null;

  const numbered = trimmed.match(/^(\d)\s*(.+)$/);
  const prefix = numbered ? `${numbered[1]}` : "";
  const rest = numbered ? numbered[2]!.trim() : trimmed;
  const compact = normalizeBookKey(`${prefix}${rest}`);
  const spaced = normalizeBookKey(trimmed);

  if (ALIASES[compact]) return ALIASES[compact];
  if (ALIASES[spaced]) return ALIASES[spaced];

  for (const book of BIBLE_BOOKS) {
    const idKey = normalizeBookKey(book.id);
    const nameKey = normalizeBookKey(book.name);
    if (compact === idKey || compact === nameKey || spaced === idKey || spaced === nameKey) {
      return book.id;
    }
    if (prefix && normalizeBookKey(`${prefix}${book.name.replace(/^\d\s*/, "")}`) === compact) {
      return book.id;
    }
  }

  return null;
}

export function getBookMatchTokens(): string[] {
  const tokens = new Set<string>();
  for (const book of BIBLE_BOOKS) {
    tokens.add(book.name);
    tokens.add(book.id.replace(/(\d)([a-z])/g, "$1 $2"));
  }
  for (const alias of Object.keys(ALIASES)) {
    const book = bookById.get(ALIASES[alias]!);
    if (book) tokens.add(alias);
  }
  return [...tokens].sort((a, b) => b.length - a.length);
}