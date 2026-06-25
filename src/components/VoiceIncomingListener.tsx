"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IncomingCallBanner, IncomingCallModal } from "@/components/IncomingCallModal";
import { acceptDmVoiceCall, declineDmVoiceCall, listenIncomingDmCalls } from "@/services/voiceService";
import { fetchUser } from "@/services/authService";
import type { VoiceSession } from "@/models";

export function VoiceIncomingListener() {
  const router = useRouter();
  const [incoming, setIncoming] = useState<VoiceSession | null>(null);
  const [callerName, setCallerName] = useState("Someone");
  const [callerPhotoUrl, setCallerPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    return listenIncomingDmCalls((sessions) => {
      const active = sessions[0] ?? null;
      setIncoming(active);
      if (!active) {
        setDismissed(false);
        return;
      }
      fetchUser(active.createdBy).then((user) => {
        if (user) {
          setCallerName(user.displayName);
          setCallerPhotoUrl(user.photoUrl ?? null);
        }
      });
    });
  }, []);

  const handleAccept = useCallback(async () => {
    if (!incoming) return;
    setBusy(true);
    try {
      await acceptDmVoiceCall(incoming);
      setDismissed(false);
      router.push(`/chat/${incoming.chatRoomId}`);
    } finally {
      setBusy(false);
    }
  }, [incoming, router]);

  const handleReject = useCallback(async () => {
    if (!incoming) return;
    setBusy(true);
    try {
      await declineDmVoiceCall(incoming);
      setIncoming(null);
      setDismissed(false);
    } finally {
      setBusy(false);
    }
  }, [incoming]);

  const handleIgnore = useCallback(() => {
    setDismissed(true);
  }, []);

  if (!incoming) return null;

  if (dismissed) {
    return (
      <IncomingCallBanner
        callerName={callerName}
        busy={busy}
        onAccept={handleAccept}
        onReject={handleReject}
        onExpand={() => setDismissed(false)}
      />
    );
  }

  return (
    <IncomingCallModal
      session={incoming}
      callerName={callerName}
      callerPhotoUrl={callerPhotoUrl}
      busy={busy}
      onAccept={handleAccept}
      onReject={handleReject}
      onIgnore={handleIgnore}
    />
  );
}
