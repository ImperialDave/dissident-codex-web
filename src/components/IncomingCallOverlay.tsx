"use client";

import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { IncomingCallBanner, IncomingCallModal } from "@/components/IncomingCallModal";
import { VoiceIncomingListener } from "@/components/VoiceIncomingListener";
import { acceptDmVoiceCall, declineDmVoiceCall } from "@/services/voiceService";
import { startIncomingCallAlerts, stopIncomingCallAlerts } from "@/lib/incomingCallAlerts";
import { useIncomingCallStore } from "@/stores/incomingCallStore";
import { useVoiceUiStore } from "@/stores/voiceUiStore";

function IncomingCallUi() {
  const session = useIncomingCallStore((s) => s.session);
  const callerName = useIncomingCallStore((s) => s.callerName);
  const callerPhotoUrl = useIncomingCallStore((s) => s.callerPhotoUrl);
  const dismissed = useIncomingCallStore((s) => s.dismissed);
  const busy = useIncomingCallStore((s) => s.busy);
  const listenerError = useIncomingCallStore((s) => s.listenerError);
  const setBusy = useIncomingCallStore((s) => s.setBusy);
  const dismiss = useIncomingCallStore((s) => s.dismiss);
  const expand = useIncomingCallStore((s) => s.expand);
  const clear = useIncomingCallStore((s) => s.clear);
  const resetMicPreflight = useVoiceUiStore((s) => s.resetMicPreflight);
  const setJoinIntent = useVoiceUiStore((s) => s.setJoinIntent);

  useEffect(() => {
    if (session?.status === "ringing") {
      startIncomingCallAlerts(callerName);
      return () => stopIncomingCallAlerts();
    }
    stopIncomingCallAlerts();
    return undefined;
  }, [session?.id, session?.status, callerName]);

  const handleAccept = useCallback(async () => {
    if (!session) return;

    setBusy(true);
    try {
      resetMicPreflight();
      await acceptDmVoiceCall(session);
      setJoinIntent(session.id);
      stopIncomingCallAlerts();
      clear();
    } finally {
      setBusy(false);
    }
  }, [session, setBusy, clear, resetMicPreflight, setJoinIntent]);

  const handleReject = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    try {
      await declineDmVoiceCall(session);
      stopIncomingCallAlerts();
      clear();
    } finally {
      setBusy(false);
    }
  }, [session, setBusy, clear]);

  const handleIgnore = useCallback(() => {
    dismiss();
  }, [dismiss]);

  if (typeof document === "undefined") return null;

  const content = (
    <>
      {listenerError && (
        <div className="fixed bottom-4 left-4 right-4 z-[95] mx-auto max-w-lg rounded-lg border border-red-500/40 bg-red-950/90 px-4 py-2 text-center text-xs text-red-200">
          Call alerts unavailable: {listenerError}
        </div>
      )}
      {session && dismissed && (
        <IncomingCallBanner
          callerName={callerName}
          busy={busy}
          onAccept={handleAccept}
          onReject={handleReject}
          onExpand={expand}
        />
      )}
      {session && !dismissed && (
        <IncomingCallModal
          session={session}
          callerName={callerName}
          callerPhotoUrl={callerPhotoUrl}
          busy={busy}
          onAccept={handleAccept}
          onReject={handleReject}
          onIgnore={handleIgnore}
        />
      )}
    </>
  );

  return createPortal(content, document.body);
}

export function IncomingCallOverlay() {
  return (
    <>
      <VoiceIncomingListener />
      <IncomingCallUi />
    </>
  );
}
