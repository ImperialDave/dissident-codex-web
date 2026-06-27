"use client";

import { useEffect, useRef, useState } from "react";

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
  const [pickerReady, setPickerReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void import("emoji-picker-element").then(() => {
      if (!cancelled) setPickerReady(true);
    });
    return () => {
      cancelled = true;
      setPickerReady(false);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !pickerReady) return;
    const picker = pickerRef.current;
    if (!picker) return;

    const handleEmoji = (event: CustomEvent<{ unicode: string }>) => {
      onSelect(event.detail.unicode);
      onClose();
    };

    picker.addEventListener("emoji-click", handleEmoji);
    return () => picker.removeEventListener("emoji-click", handleEmoji);
  }, [open, onClose, onSelect, pickerReady]);

  if (!open) return null;

  return (
    <div className="codex-modal-overlay z-[70]" onClick={onClose} role="presentation">
      <div
        className="codex-modal max-w-md"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="emoji-picker-title"
      >
        <div className="codex-modal-header">
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
          {pickerReady ? (
            /* @ts-expect-error emoji-picker-element custom element */
            <emoji-picker
              ref={pickerRef}
              className="w-full"
              style={{ width: "100%", height: "360px", border: "none", background: "transparent" }}
            />
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">Loading emojis…</p>
          )}
        </div>
      </div>
    </div>
  );
}
