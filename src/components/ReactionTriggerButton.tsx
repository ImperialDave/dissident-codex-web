"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { EmojiPickerModal } from "./EmojiPickerModal";
import { ReactionPicker } from "./ReactionPicker";
import { ThumbsUpIcon } from "./ThumbsUpIcon";
import { THUMBS_UP_EMOJI } from "@/lib/emoji";
import { useLongPress } from "@/hooks/useLongPress";

interface ReactionTriggerButtonProps {
  active: boolean;
  disabled?: boolean;
  quickEmojis: string[];
  onToggle: (emoji: string) => void | Promise<void>;
  variant?: "default" | "compact" | "hover";
  pickerAlign?: "start" | "end";
}

export function ReactionTriggerButton({
  active,
  disabled = false,
  quickEmojis,
  onToggle,
  variant = "default",
  pickerAlign = "start",
}: ReactionTriggerButtonProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const closePicker = useCallback(() => setPickerOpen(false), []);

  const handleTap = useCallback(() => {
    if (pickerOpen) {
      closePicker();
      return;
    }
    void onToggle(THUMBS_UP_EMOJI);
    setBouncing(true);
    window.setTimeout(() => setBouncing(false), 220);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, [closePicker, onToggle, pickerOpen]);

  const handleLongPress = useCallback(() => {
    setPickerOpen(true);
  }, []);

  const { isHolding, handlers } = useLongPress({
    onTap: handleTap,
    onLongPress: handleLongPress,
    disabled,
  });

  const handlePick = useCallback(
    async (emoji: string) => {
      await onToggle(emoji);
      closePicker();
      setFullOpen(false);
    },
    [closePicker, onToggle]
  );

  useEffect(() => {
    if (!pickerOpen) return;

    function handleOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        closePicker();
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") closePicker();
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closePicker, pickerOpen]);

  const sizeClass =
    variant === "compact" ? "h-7 w-7" : variant === "hover" ? "h-7 w-7" : "h-9 w-9";
  const iconSize = variant === "compact" || variant === "hover" ? "sm" : "md";

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        aria-label="Thumbs up. Hold for more reactions"
        aria-pressed={active}
        aria-expanded={pickerOpen}
        aria-haspopup="true"
        className={clsx(
          "reaction-trigger-btn flex items-center justify-center rounded-full border transition",
          sizeClass,
          variant === "hover" &&
            "border-transparent opacity-0 group-hover/reaction:opacity-100",
          variant !== "hover" && "border-white/10 hover:border-[var(--color-accent)]/40",
          active && "reaction-thumb-active border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10",
          isHolding && "reaction-thumb-holding scale-105",
          bouncing && "reaction-thumb-bounce",
          disabled && "opacity-50"
        )}
        style={{ touchAction: "manipulation", WebkitTouchCallout: "none" }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (!disabled) setPickerOpen(true);
        }}
        {...handlers}
      >
        <ThumbsUpIcon filled={active} size={iconSize} />
      </button>

      {pickerOpen && (
        <div
          className={clsx(
            "reaction-picker-popover absolute bottom-full z-30 mb-2",
            pickerAlign === "end" ? "right-0" : "left-0"
          )}
        >
          <ReactionPicker
            emojis={quickEmojis}
            disabled={disabled}
            onPick={handlePick}
            onOpenFull={() => {
              closePicker();
              setFullOpen(true);
            }}
          />
        </div>
      )}

      <EmojiPickerModal
        open={fullOpen}
        onClose={() => setFullOpen(false)}
        onSelect={handlePick}
      />
    </div>
  );
}