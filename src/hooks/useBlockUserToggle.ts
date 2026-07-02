"use client";

import { useCallback, useState } from "react";
import type { BlockStatus } from "@/models";
import { blockUser, unblockUser } from "@/services/blockService";
import { sanitizeUserError } from "@/lib/utils";

interface UseBlockUserToggleOptions {
  otherUid: string;
  displayName: string;
  blockStatus: BlockStatus;
  onChanged: () => void | Promise<void>;
  onError?: (message: string) => void;
}

export function useBlockUserToggle({
  otherUid,
  displayName,
  blockStatus,
  onChanged,
  onError,
}: UseBlockUserToggleOptions) {
  const [busy, setBusy] = useState(false);
  const isBlocked = blockStatus === "you_blocked";

  const toggleBlock = useCallback(async () => {
    if (busy) return;

    if (isBlocked) {
      if (!confirm(`Unblock ${displayName}? You'll be able to see their posts and message them again.`)) {
        return;
      }
    } else if (
      !confirm(
        `Block ${displayName}? They won't be able to message you, and you won't see their posts or comments.`
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      if (isBlocked) {
        await unblockUser(otherUid);
      } else {
        await blockUser(otherUid);
      }
      await onChanged();
    } catch (err) {
      onError?.(sanitizeUserError(err, isBlocked ? "Could not unblock user" : "Could not block user"));
    } finally {
      setBusy(false);
    }
  }, [busy, displayName, isBlocked, onChanged, onError, otherUid]);

  return { busy, isBlocked, toggleBlock };
}