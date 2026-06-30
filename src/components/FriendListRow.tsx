"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/Button";
import { UserRelationshipMenu } from "@/components/UserRelationshipMenu";
import type { ChessGame, Friend } from "@/models";

interface FriendListRowProps {
  friend: Friend;
  busy: boolean;
  activeGame?: ChessGame | null;
  showMessageButton?: boolean;
  onMessage?: () => void;
  onChess: () => void;
  onRelationshipChanged?: () => void | Promise<void>;
  onRelationshipError?: (message: string) => void;
}

export function FriendListRow({
  friend,
  busy,
  activeGame,
  showMessageButton = false,
  onMessage,
  onChess,
  onRelationshipChanged,
  onRelationshipError,
}: FriendListRowProps) {
  const chessLabel = busy
    ? showMessageButton
      ? "..."
      : "Starting..."
    : activeGame
      ? "Continue"
      : showMessageButton
        ? "Chess"
        : "Play";

  return (
    <div className="codex-list-row flex flex-wrap items-center justify-between gap-3">
      <Link href={`/user/${friend.uid}`} className="flex min-w-0 flex-1 items-center gap-3">
        <UserAvatar name={friend.displayName} photoUrl={friend.photoUrl} size="sm" />
        <span className="font-medium">{friend.displayName}</span>
      </Link>
      <div className="flex items-center gap-2">
        {showMessageButton && onMessage && (
          <Button variant="secondary" size="sm" onClick={onMessage} disabled={busy}>
            Message
          </Button>
        )}
        <Button
          variant={activeGame ? "accent" : showMessageButton ? "ghost" : "secondary"}
          size="sm"
          onClick={onChess}
          disabled={busy}
        >
          {chessLabel}
        </Button>
        {onRelationshipChanged && (
          <UserRelationshipMenu
            otherUid={friend.uid}
            displayName={friend.displayName}
            friendStatus="friends"
            blockStatus="none"
            onChanged={onRelationshipChanged}
            onError={onRelationshipError}
          />
        )}
      </div>
    </div>
  );
}