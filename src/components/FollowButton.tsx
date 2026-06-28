"use client";

import { UserPlus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface FollowButtonProps {
  isFollowing: boolean;
  busy?: boolean;
  onToggle: () => void;
}

export function FollowButton({ isFollowing, busy, onToggle }: FollowButtonProps) {
  return (
    <Button
      variant={isFollowing ? "secondary" : "accent"}
      size="sm"
      onClick={onToggle}
      disabled={busy}
      className="inline-flex items-center gap-1.5"
    >
      {isFollowing ? (
        <>
          <UserMinus className="h-4 w-4" />
          {busy ? "Unfollowing..." : "Unfollow"}
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          {busy ? "Following..." : "Follow"}
        </>
      )}
    </Button>
  );
}