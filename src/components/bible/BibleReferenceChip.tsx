"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { BiblePassageCard } from "@/components/bible/BiblePassageCard";
import { resolvePassage } from "@/lib/bible/resolvePassage";
import type { BiblePassage, BibleReference } from "@/lib/bible/types";

interface BibleReferenceChipProps {
  displayText: string;
  reference: BibleReference;
  expandable: boolean;
}

export function BibleReferenceChip({ displayText, reference, expandable }: BibleReferenceChipProps) {
  const [open, setOpen] = useState(false);
  const [passage, setPassage] = useState<BiblePassage | null>(null);
  const [loading, setLoading] = useState(false);
  const popoverId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  const loadPassage = useCallback(async () => {
    if (!expandable || passage || loading) return;
    setLoading(true);
    try {
      setPassage(await resolvePassage(reference));
    } finally {
      setLoading(false);
    }
  }, [expandable, loading, passage, reference]);

  useEffect(() => {
    if (!open || !expandable) return;
    void loadPassage();
  }, [open, expandable, loadPassage]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  if (!expandable) {
    return <span>{displayText}</span>;
  }

  return (
    <span ref={rootRef} className="codex-bible-ref-wrap">
      <button
        type="button"
        className="codex-bible-ref-chip"
        aria-expanded={open}
        aria-controls={popoverId}
        onMouseEnter={() => {
          if (window.matchMedia("(hover: hover)").matches) setOpen(true);
        }}
        onMouseLeave={() => {
          if (window.matchMedia("(hover: hover)").matches) setOpen(false);
        }}
        onClick={() => setOpen((value) => !value)}
      >
        {displayText}
      </button>
      {open && (
        <div id={popoverId} className="codex-bible-ref-popover" role="region" aria-label={displayText}>
          {loading && <p className="codex-bible-ref-loading">Loading passage...</p>}
          {!loading && passage && <BiblePassageCard passage={passage} />}
        </div>
      )}
    </span>
  );
}