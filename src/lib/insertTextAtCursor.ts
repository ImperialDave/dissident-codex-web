export function insertTextAtCursor(
  current: string,
  insert: string,
  element?: HTMLTextAreaElement | null
): { value: string; cursor: number } {
  const snippet = current ? ` ${insert}` : insert;

  if (!element) {
    return { value: current + snippet, cursor: (current + snippet).length };
  }

  const start = element.selectionStart ?? current.length;
  const end = element.selectionEnd ?? current.length;
  const prefix = current.slice(0, start);
  const suffix = current.slice(end);
  const spacerBefore = prefix.length > 0 && !/\s$/.test(prefix) ? " " : "";
  const spacerAfter = suffix.length > 0 && !/^\s/.test(suffix) ? " " : "";
  const next = `${prefix}${spacerBefore}${insert}${spacerAfter}${suffix}`;
  const cursor = (prefix + spacerBefore + insert).length;
  return { value: next, cursor };
}