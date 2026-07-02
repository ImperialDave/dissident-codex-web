"use client";

import { useState } from "react";
import { Ban, MoreHorizontal, UserCheck, UserMinus, UserX } from "lucide-react";
import { DropdownDivider, DropdownItem, DropdownMenu } from "@/components/ui/DropdownMenu";
import { useBlockUserToggle } from "@/hooks/useBlockUserToggle";
import type { BlockStatus } from "@/models";
import {
  cancelOutgoingFriendRequest,
  removeFriend,
  type FriendshipStatus,
} from "@/services/friendService";
import { sanitizeUserError } from "@/lib/utils";

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
  const { busy: blockBusy, isBlocked, toggleBlock } = useBlockUserToggle({
    otherUid,
    displayName,
    blockStatus,
    onChanged,
    onError,
  });

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
      onError?.(sanitizeUserError(err));
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

  async function handleToggleBlock() {
    setOpen(false);
    await toggleBlock();
  }

  const menuBusy = busy || blockBusy;

  return (
    <div className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={menuBusy}
        className="codex-btn-icon"
        aria-label={`Options for ${displayName}`}
        aria-expanded={open}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      <DropdownMenu open={open} onClose={() => setOpen(false)}>
        {friendStatus === "friends" && !isBlocked && (
          <DropdownItem icon={UserMinus} onClick={() => void handleUnfriend()}>
            Unfriend
          </DropdownItem>
        )}
        {friendStatus === "pending_out" && !isBlocked && (
          <DropdownItem icon={UserX} onClick={() => void handleCancelRequest()}>
            Cancel friend request
          </DropdownItem>
        )}
        {(friendStatus === "friends" || friendStatus === "pending_out") && !isBlocked && (
          <DropdownDivider />
        )}
        {isBlocked ? (
          <DropdownItem icon={UserCheck} onClick={() => void handleToggleBlock()}>
            {blockBusy ? "Unblocking..." : "Unblock user"}
          </DropdownItem>
        ) : (
          <DropdownItem icon={Ban} destructive onClick={() => void handleToggleBlock()}>
            {blockBusy ? "Blocking..." : "Block user"}
          </DropdownItem>
        )}
      </DropdownMenu>
    </div>
  );
}