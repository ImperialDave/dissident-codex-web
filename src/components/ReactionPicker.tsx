"use client";

interface ReactionPickerProps {
  emojis: string[];
  onPick: (emoji: string) => void;
  onOpenFull: () => void;
  disabled?: boolean;
  className?: string;
}

export function ReactionPicker({
  emojis,
  onPick,
  onOpenFull,
  disabled = false,
  className = "",
}: ReactionPickerProps) {
  return (
    <div
      className={`flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-1 shadow-lg ${className}`}
      role="toolbar"
      aria-label="Quick reactions"
    >
      {emojis.map((emoji, index) => (
        <button
          key={emoji}
          type="button"
          disabled={disabled}
          onClick={() => onPick(emoji)}
          className="reaction-picker-emoji flex h-9 w-9 items-center justify-center rounded-full text-xl transition hover:scale-110 hover:bg-white/10 disabled:opacity-50 sm:h-10 sm:w-10"
          style={{ animationDelay: `${index * 30}ms` }}
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={onOpenFull}
        className="reaction-picker-emoji flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-white/25 text-lg text-slate-300 transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50 sm:h-10 sm:w-10"
        style={{ animationDelay: `${emojis.length * 30}ms` }}
        aria-label="More reactions"
      >
        +
      </button>
    </div>
  );
}