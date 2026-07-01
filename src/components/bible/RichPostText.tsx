"use client";

import { Fragment, useMemo } from "react";
import { BibleReferenceChip } from "@/components/bible/BibleReferenceChip";
import {
  countVersesInReference,
  MAX_VERSES_PER_POST,
  segmentTextWithReferences,
} from "@/lib/bible/parseReferences";

interface RichPostTextProps {
  text: string;
  className?: string;
}

export function RichPostText({ text, className }: RichPostTextProps) {
  const segments = useMemo(() => segmentTextWithReferences(text), [text]);

  const expandableByIndex = useMemo(() => {
    let used = 0;
    return segments.map((segment) => {
      if (segment.type !== "reference") return false;
      const count = countVersesInReference(segment.reference);
      if (used + count > MAX_VERSES_PER_POST) return false;
      used += count;
      return true;
    });
  }, [segments]);

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <Fragment key={`t-${index}`}>{segment.value}</Fragment>;
        }

        return (
          <BibleReferenceChip
            key={`r-${index}-${segment.reference.raw}`}
            displayText={segment.value}
            reference={segment.reference}
            expandable={expandableByIndex[index] ?? false}
          />
        );
      })}
    </span>
  );
}