"use client";

import { useEffect, useRef } from "react";
import { fetchUser } from "@/services/authService";
import { listenNotifications } from "@/services/notificationService";
import {
  getVoiceSession,
  listenIncomingDmCalls,
} from "@/services/voiceService";
import { useAuthStore } from "@/stores/authStore";
import { useIncomingCallStore } from "@/stores/incomingCallStore";
import type { VoiceSession } from "@/models";

function formatListenerError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("index")) {
    return "Firestore index is building — try again in a few minutes.";
  }
  if (message.includes("permission") || message.includes("Permission")) {
    return "Permission denied — refresh and sign in again.";
  }
  return message || "Could not listen for incoming calls.";
}

export function VoiceIncomingListener() {
  const uid = useAuthStore((s) => s.user?.uid);
  const setIncoming = useIncomingCallStore((s) => s.setIncoming);
  const setCaller = useIncomingCallStore((s) => s.setCaller);
  const clear = useIncomingCallStore((s) => s.clear);
  const setListenerError = useIncomingCallStore((s) => s.setListenerError);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!uid) {
      clear();
      setListenerError(null);
      return;
    }

    const loadCaller = (session: VoiceSession) => {
      fetchUser(session.createdBy).then((user) => {
        if (user) {
          setCaller(user.displayName, user.photoUrl ?? null);
        }
      });
    };

    const applySession = (session: VoiceSession | null) => {
      if (!session || session.status !== "ringing" || session.calleeUid !== uid) {
        if (!session) clear();
        return;
      }
      setListenerError(null);
      setIncoming(session);
      loadCaller(session);
    };

    const unsubCalls = listenIncomingDmCalls(
      uid,
      (sessions) => {
        applySession(sessions[0] ?? null);
      },
      (err) => {
        console.error("[incoming-call]", err);
        setListenerError(formatListenerError(err));
      }
    );

    const unsubNotifs = listenNotifications(
      (notifs) => {
        const voiceNotif = notifs.find(
          (n) => !n.read && n.type === "VOICE_INCOMING" && n.targetId
        );
        if (!voiceNotif?.targetId) return;

        if (useIncomingCallStore.getState().session?.id === voiceNotif.targetId) return;

        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = setTimeout(() => {
          const active = useIncomingCallStore.getState().session;
          if (active?.status === "ringing") return;

          getVoiceSession(voiceNotif.targetId!).then((session) => {
            if (session?.status === "ringing" && session.calleeUid === uid) {
              applySession(session);
              if (voiceNotif.actorName) {
                setCaller(voiceNotif.actorName, null);
              }
            }
          });
        }, 2000);
      },
      (err) => {
        console.warn("[incoming-call] notification fallback", err);
      }
    );

    return () => {
      unsubCalls();
      unsubNotifs?.();
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [uid, setIncoming, setCaller, clear, setListenerError]);

  return null;
}