"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Check, X } from "lucide-react";
import { BIBLE_BOOKS } from "@/lib/bible/books";
import { parseReferenceString } from "@/lib/bible/parseReferences";
import { resolvePassage } from "@/lib/bible/resolvePassage";

interface BiblePickerProps {
  open: boolean;
  onClose: () => void;
  onInsert: (reference: string) => void;
}

export function BiblePicker({ open, onClose, onInsert }: BiblePickerProps) {
  const [bookId, setBookId] = useState("john");
  const [chapter, setChapter] = useState(3);
  const [startVerse, setStartVerse] = useState(16);
  const [endVerse, setEndVerse] = useState(16);
  const [useRange, setUseRange] = useState(false);
  const [preview, setPreview] = useState("");
  const [copied, setCopied] = useState<"ref" | "text" | null>(null);

  const book = useMemo(() => BIBLE_BOOKS.find((b) => b.id === bookId), [bookId]);

  const referenceString = useMemo(() => {
    if (!book) return "";
    if (useRange && endVerse > startVerse) {
      return `${book.name} ${chapter}:${startVerse}-${endVerse}`;
    }
    return `${book.name} ${chapter}:${startVerse}`;
  }, [book, chapter, endVerse, startVerse, useRange]);

  useEffect(() => {
    if (!open || !referenceString) {
      setPreview("");
      return;
    }

    const ref = parseReferenceString(referenceString);
    if (!ref) {
      setPreview("");
      return;
    }

    let cancelled = false;
    resolvePassage(ref).then((passage) => {
      if (cancelled) return;
      if (!passage) {
        setPreview("");
        return;
      }
      setPreview(
        passage.verses.map((v) => (passage.verses.length > 1 ? `${v.verse}. ${v.text}` : v.text)).join("\n")
      );
    });

    return () => {
      cancelled = true;
    };
  }, [open, referenceString]);

  if (!open) return null;

  async function copyValue(value: string, kind: "ref" | "text") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="codex-modal-overlay" onClick={onClose}>
      <div
        className="codex-modal codex-bible-picker max-w-lg"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="bible-picker-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 id="bible-picker-title" className="font-semibold">
            Insert Bible reference
          </h2>
          <button type="button" onClick={onClose} className="codex-btn-icon" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <label className="block text-sm">
            Book
            <select
              value={bookId}
              onChange={(e) => {
                setBookId(e.target.value);
                setChapter(1);
                setStartVerse(1);
                setEndVerse(1);
              }}
              className="codex-input mt-1 w-full rounded-lg px-3 py-2"
            >
              {BIBLE_BOOKS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="block text-sm">
              Chapter
              <input
                type="number"
                min={1}
                max={book?.chapters ?? 1}
                value={chapter}
                onChange={(e) => setChapter(Number.parseInt(e.target.value, 10) || 1)}
                className="codex-input mt-1 w-full rounded-lg px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              Verse
              <input
                type="number"
                min={1}
                value={startVerse}
                onChange={(e) => {
                  const next = Number.parseInt(e.target.value, 10) || 1;
                  setStartVerse(next);
                  if (!useRange || endVerse < next) setEndVerse(next);
                }}
                className="codex-input mt-1 w-full rounded-lg px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              End verse
              <input
                type="number"
                min={startVerse}
                value={endVerse}
                disabled={!useRange}
                onChange={(e) => setEndVerse(Number.parseInt(e.target.value, 10) || startVerse)}
                className="codex-input mt-1 w-full rounded-lg px-3 py-2 disabled:opacity-50"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useRange}
              onChange={(e) => {
                setUseRange(e.target.checked);
                if (!e.target.checked) setEndVerse(startVerse);
              }}
            />
            Verse range
          </label>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide codex-text-muted">Reference</p>
            <p className="mt-1 font-medium text-[var(--color-accent)]">{referenceString}</p>
            {preview && (
              <p className="mt-3 whitespace-pre-wrap text-sm codex-text-muted line-clamp-6">{preview}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onInsert(referenceString);
                onClose();
              }}
              className="codex-btn-accent rounded-full px-4 py-2 text-sm font-semibold"
            >
              Insert reference
            </button>
            <button
              type="button"
              onClick={() => void copyValue(referenceString, "ref")}
              className="codex-btn-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
            >
              {copied === "ref" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy reference
            </button>
            {preview && (
              <button
                type="button"
                onClick={() => void copyValue(`${referenceString}\n\n${preview}`, "text")}
                className="codex-btn-ghost inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
              >
                {copied === "text" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copy text
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}