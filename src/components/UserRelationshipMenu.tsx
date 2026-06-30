"use client";

import { useState } from "react";
import { Ban, MoreHorizontal, UserMinus, UserX } from "lucide-react";
import { DropdownDivider, DropdownItem, DropdownMenu } from "@/components/ui/DropdownMenu";
import type { BlockStatus } from "@/models";
import { blockUser, unblockUser } from "@/services/blockService";
import {
  cancelOutgoingFriendRequest,
  removeFriend,
  type FriendshipStatus,
} from "@/services/friendService";
import { mapFirestoreError } from "@/lib/utils";

interface UserRelationshipMenuProps {
  otherUid: string;
  displayName: string;
  friendStatus: FriendshipStatus;
  blockStatus: BlockStatus;
  onChanged: () => void | Promise<void>;
  onError?: (message: string) => void;
  className?: string;
}

export function UserRelationshipMenu({
  otherUid,
  displayName,
  friendStatus,
  blockStatus,
  onChanged,
  onError,
  className,
}: UserRelationshipMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const hasActions =
    friendStatus === "friends" ||
    friendStatus === "pending_out" ||
    blockStatus === "you_blocked" ||
    blockStatus === "none";

  if (!hasActions) return null;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setOpen(false);
    try {
      await action();
      await onChanged();
    } catch (err) {
      onError?.(err instanceof Error ? mapFirestoreError(err.message) : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnfriend() {
    if (!confirm(`Remove ${displayName} from your friends?`)) return;
    await run(() => removeFriend(otherUid));
  }

  async function handleCancelRequest() {
    await run(() => cancelOutgoingFriendRequest(otherUid));
  }

  async function handleBlock() {
    if (
      !confirm(
        `Block ${displayName}? They won't be able to message you, and you won't see their posts or comments.`
      )
    ) {
      return;
    }
    await run(() => blockUser(otherUid));
  }

  async function handleUnblock() {
    await run(() => unblockUser(otherUid));
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={busy}
        className="codex-btn-icon"
        aria-label={`Options for ${displayName}`}
        aria-expanded={open}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      <DropdownMenu open={open} onClose={() => setOpen(false)}>
        {friendStatus === "friends" && blockStatus !== "you_blocked" && (
          <DropdownItem icon={UserMinus} onClick={() => void handleUnfriend()}>
            Unfriend
          </DropdownItem>
        )}
        {friendStatus === "pending_out" && blockStatus !== "you_blocked" && (
          <DropdownItem icon={UserX} onClick={() => void handleCancelRequest()}>
            Cancel friend request
          </DropdownItem>
        )}
        {(friendStatus === "friends" || friendStatus === "pending_out") &&
          blockStatus !== "you_blocked" && <DropdownDivider />}
        {blockStatus === "you_blocked" ? (
          <DropdownItem onClick={() => void handleUnblock()}>Unblock user</DropdownItem>
        ) : (
          <DropdownItem icon={Ban} destructive onClick={() => void handleBlock()}>
            Block user
          </DropdownItem>
        )}
      </DropdownMenu>
    </div>
  );
}
