"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import type { BiblePassage } from "@/lib/bible/types";

interface BiblePassageCardProps {
  passage: BiblePassage;
}

function passagePlainText(passage: BiblePassage): string {
  const body = passage.verses
    .map((v) => (passage.verses.length > 1 ? `${v.verse} ${v.text}` : v.text))
    .join(" ");
  return `${passage.label} (WEB)\n${body}`;
}

export function BiblePassageCard({ passage }: BiblePassageCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(passagePlainText(passage));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="codex-bible-passage">
      <div className="codex-bible-passage__header">
        <span className="codex-bible-passage__label">{passage.label}</span>
        <span className="codex-bible-passage__translation">WEB</span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="codex-bible-passage__copy"
          aria-label="Copy passage"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <div className="codex-bible-passage__body">
        {passage.verses.map((verse) => (
          <p key={`${verse.chapter}:${verse.verse}`} className="codex-bible-passage__verse">
            {passage.verses.length > 1 && (
              <span className="codex-bible-passage__verse-num">{verse.verse}</span>
            )}
            <span>{verse.text}</span>
          </p>
        ))}
      </div>
    </div>
  );
}