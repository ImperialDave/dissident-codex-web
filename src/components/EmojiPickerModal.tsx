"use client";

import { useEffect, useRef } from "react";
import "emoji-picker-element";

type EmojiPickerElement = HTMLElement & {
  addEventListener(
    type: "emoji-click",
    listener: (event: CustomEvent<{ unicode: string }>) => void
  ): void;
  removeEventListener(
    type: "emoji-click",
    listener: (event: CustomEvent<{ unicode: string }>) => void
  ): void;
};

interface EmojiPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export function EmojiPickerModal({ open, onClose, onSelect }: EmojiPickerModalProps) {
  const pickerRef = useRef<EmojiPickerElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const picker = pickerRef.current;
    if (!picker) return;

    const handleEmoji = (event: CustomEvent<{ unicode: string }>) => {
      onSelect(event.detail.unicode);
      onClose();
    };

    picker.addEventListener("emoji-click", handleEmoji);
    return () => picker.removeEventListener("emoji-click", handleEmoji);
  }, [open, onClose, onSelect]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="codex-surface max-h-[85vh] w-full max-w-md overflow-hidden rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="emoji-picker-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 id="emoji-picker-title" className="font-semibold text-[var(--color-on-surface)]">
            Choose a reaction
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="codex-btn-ghost rounded-lg px-2 py-1 text-sm"
          >
            Close
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto p-2">
          {/* @ts-expect-error emoji-picker-element custom element */}
          <emoji-picker
            ref={pickerRef}
            className="w-full"
            style={{ width: "100%", height: "360px", border: "none", background: "transparent" }}
          />
        </div>
      </div>
    </div>
  );
}
