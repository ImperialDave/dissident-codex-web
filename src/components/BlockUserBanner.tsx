"use client";

import type { BlockStatus } from "@/models";
import { useBlockUserToggle } from "@/hooks/useBlockUserToggle";

interface BlockUserBannerProps {
  otherUid: string;
  displayName: string;
  blockStatus: BlockStatus;
  onChanged: () => void | Promise<void>;
  onError?: (message: string) => void;
}

export function BlockUserBanner({
  otherUid,
  displayName,
  blockStatus,
  onChanged,
  onError,
}: BlockUserBannerProps) {
  const { busy, isBlocked, toggleBlock } = useBlockUserToggle({
    otherUid,
    displayName,
    blockStatus,
    onChanged,
    onError,
  });

  if (!isBlocked) return null;

  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
      <p className="text-sm codex-text-muted">
        You blocked {displayName}. Their posts and messages are hidden from you until you unblock
        them.
      </p>
      <button
        type="button"
        onClick={() => void toggleBlock()}
        disabled={busy}
        className="codex-btn-secondary mt-3 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {busy ? "Unblocking..." : "Unblock user"}
      </button>
    </div>
  );
}