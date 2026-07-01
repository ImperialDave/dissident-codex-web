/** Strip WEB footnote markers and inline translator notes for display. */
export function cleanVerseText(text: string): string {
  return text
    .replace(/[†‡§]/g, "")
    .replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"')
    .replace(/\u2019/g, "'")
    .replace(/\d+:\d+\s+The same[^.]*\./gi, " ")
    .replace(/\d+:\d+\s+The phrase[^.]*\./gi, " ")
    .replace(/\d+:\d+\s+The word[^.]*\./gi, " ")
    .replace(/\d+:\d+\s+[^.]{12,}\./g, " ")
    .replace(/\s+/g, " ")
    .trim();
}