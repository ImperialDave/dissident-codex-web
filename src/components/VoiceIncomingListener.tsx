"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { IncomingCallModal } from "@/components/IncomingCallModal";
import { acceptDmVoiceCall, declineDmVoiceCall, listenIncomingDmCalls } from "@/services/voiceService";
import { getChatRoom } from "@/services/chatService";
import type { VoiceSession } from "@/models";

export function VoiceIncomingListener() {
  const router = useRouter();
  const pathname = usePathname();
  const [incoming, setIncoming] = useState<VoiceSession | null>(null);
  const [callerName, setCallerName] = useState("Someone");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return listenIncomingDmCalls((sessions) => {
      const active = sessions[0] ?? null;
      setIncoming(active);
      if (active) {
        getChatRoom(active.chatRoomId).then((room) => {
          if (room) setCallerName(room.title);
        });
      }
    });
  }, []);

  if (!incoming) return null;
  if (pathname === `/chat/${incoming.chatRoomId}`) return null;

  return (
    <IncomingCallModal
      session={incoming}
      callerName={callerName}
      busy={busy}
      onAccept={async () => {
        setBusy(true);
        try {
          await acceptDmVoiceCall(incoming);
          router.push(`/chat/${incoming.chatRoomId}`);
        } finally {
          setBusy(false);
        }
      }}
      onDecline={async () => {
        setBusy(true);
        try {
          await declineDmVoiceCall(incoming);
          setIncoming(null);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
