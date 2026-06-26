"use client";

import { useEffect, useState } from "react";
import { chatRoomDisplayTitle, isDmRoom, otherDmMemberId } from "@/lib/chatDisplay";
import { fetchUser } from "@/services/authService";
import type { ChatRoom } from "@/models";

interface ChatRoomTitleProps {
  room: ChatRoom | null;
  myUid?: string;
  className?: string;
}

export function ChatRoomTitle({ room, myUid, className }: ChatRoomTitleProps) {
  const [title, setTitle] = useState(room?.title || "Chat");

  useEffect(() => {
    if (!room) {
      setTitle("Chat");
      return;
    }

    if (!myUid || !isDmRoom(room)) {
      setTitle(room.title || "Chat");
      return;
    }

    const otherId = otherDmMemberId(room, myUid);
    if (!otherId) {
      setTitle(room.title || "Direct Message");
      return;
    }

    let cancelled = false;
    setTitle("Direct Message");

    fetchUser(otherId).then((user) => {
      if (cancelled) return;
      setTitle(
        chatRoomDisplayTitle(room, myUid, {
          [otherId]: user?.displayName || "Direct Message",
        })
      );
    });

    return () => {
      cancelled = true;
    };
  }, [room, myUid]);

  return <span className={className}>{title}</span>;
}