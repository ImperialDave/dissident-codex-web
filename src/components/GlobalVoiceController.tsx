"use client";

import { useCallback, useEffect, useState } from "react";
import { FloatingVoiceCallBar } from "@/components/FloatingVoiceCallBar";
import type { VoiceCallPhase } from "@/components/VoiceCallBar";
import { useVoiceRoom } from "@/hooks/useVoiceRoom";
import { chatRoomDisplayTitle, resolveDmDisplayNames } from "@/lib/chatDisplay";
import { ensureMicrophoneForVoice } from "@/lib/microphonePermission";
import { getChatRoom } from "@/services/chatService";
import {
  declineDmVoiceCall,
  joinTopicOrGroupVoice,
  listenVoiceSession,
  startDmVoiceCall,
} from "@/services/voiceService";
import { useAuthStore } from "@/stores/authStore";
import { useVoiceUiStore } from "@/stores/voiceUiStore";
import {
  CHAT_TYPE_DM,
  CHAT_TYPE_GROUP,
  CHAT_TYPE_TOPIC,
  VOICE_TYPE_DM,
  type ChatRoom,
  type VoiceSession,
} from "@/models";

function toUiVoiceSession(session: VoiceSession | null): VoiceSession | null {
  if (!session || session.status === "ended") return null;
  return session;
}

function isCallParty(
  session: VoiceSession,
  myUid: string,
  joinIntentSessionId: string | null
): boolean {
  if (joinIntentSessionId === session.id) return true;
  if (session.createdBy === myUid) return true;
  if (session.calleeUid === myUid) return true;
  const participant = session.participants[myUid];
  return Boolean(participant && !participant.leftAt);
}

export function GlobalVoiceController() {
  const user = useAuthStore((s) => s.user);
  const myUid = user?.uid;
  const displayName = user?.displayName || "User";

  const joinIntentSessionId = useVoiceUiStore((s) => s.joinIntentSessionId);
  const setJoinIntent = useVoiceUiStore((s) => s.setJoinIntent);
  const clearJoinIntent = useVoiceUiStore((s) => s.clearJoinIntent);
  const resetMicPreflight = useVoiceUiStore((s) => s.resetMicPreflight);
  const registerVoiceActions = useVoiceUiStore((s) => s.registerVoiceActions);
  const unregisterVoiceActions = useVoiceUiStore((s) => s.unregisterVoiceActions);

  const [session, setSession] = useState<VoiceSession | null>(null);
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [callLabel, setCallLabel] = useState("Voice");
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [manualJoinBusy, setManualJoinBusy] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  const applySession = useCallback(
    (next: VoiceSession | null) => {
      const uiSession = toUiVoiceSession(next);
      setSession(uiSession);
      if (!uiSession || uiSession.status === "ended") {
        clearJoinIntent();
      }
    },
    [clearJoinIntent]
  );

  useEffect(() => {
    if (!joinIntentSessionId) {
      setSession(null);
      return;
    }
    return listenVoiceSession(joinIntentSessionId, applySession);
  }, [joinIntentSessionId, applySession]);

  useEffect(() => {
    if (!session?.chatRoomId) {
      setRoom(null);
      setCallLabel("Voice");
      return;
    }

    let cancelled = false;
    (async () => {
      const fetchedRoom = await getChatRoom(session.chatRoomId);
      if (cancelled || !fetchedRoom) return;

      setRoom(fetchedRoom);

      if (fetchedRoom.type === CHAT_TYPE_TOPIC) {
        setCallLabel("Topic voice");
      } else if (fetchedRoom.type === CHAT_TYPE_GROUP) {
        setCallLabel("Group voice");
      } else if (myUid) {
        const names = await resolveDmDisplayNames([fetchedRoom], myUid);
        setCallLabel(chatRoomDisplayTitle(fetchedRoom, myUid, names));
      } else {
        setCallLabel("Call");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.chatRoomId, myUid]);

  const callParty = Boolean(session && myUid && isCallParty(session, myUid, joinIntentSessionId));
  const shouldConnect = Boolean(session?.status === "active" && callParty);

  const voice = useVoiceRoom({
    session,
    displayName,
    shouldConnect,
  });

  const handleStartDmCall = useCallback(
    async (targetRoom: ChatRoom) => {
      setVoiceError("");
      const mic = await ensureMicrophoneForVoice();
      if (mic.status !== "granted") {
        if (mic.message && mic.status !== "denied") setVoiceError(mic.message);
        return;
      }

      setVoiceBusy(true);
      try {
        const created = await startDmVoiceCall(targetRoom);
        setJoinIntent(created.id);
        setSession(created);
      } catch (err) {
        setVoiceError(err instanceof Error ? err.message : "Could not start call");
      } finally {
        setVoiceBusy(false);
      }
    },
    [setJoinIntent]
  );

  const resetConnect = voice.resetConnect;

  const handleJoinChannel = useCallback(
    async (targetRoom: ChatRoom) => {
      setVoiceError("");
      const mic = await ensureMicrophoneForVoice();
      if (mic.status !== "granted") {
        if (mic.message && mic.status !== "denied") setVoiceError(mic.message);
        return;
      }

      setVoiceBusy(true);
      resetConnect();
      try {
        const joined = await joinTopicOrGroupVoice(targetRoom);
        setJoinIntent(joined.id);
      } catch (err) {
        setVoiceError(err instanceof Error ? err.message : "Could not join voice");
      } finally {
        setVoiceBusy(false);
      }
    },
    [setJoinIntent, resetConnect]
  );

  useEffect(() => {
    registerVoiceActions({
      startDmCall: handleStartDmCall,
      joinChannelVoice: handleJoinChannel,
    });
    return unregisterVoiceActions;
  }, [handleStartDmCall, handleJoinChannel, registerVoiceActions, unregisterVoiceActions]);

  const handleManualJoin = useCallback(async () => {
    setVoiceError("");
    setManualJoinBusy(true);
    try {
      const mic = await ensureMicrophoneForVoice();
      if (mic.status !== "granted") {
        if (mic.message && mic.status !== "denied") setVoiceError(mic.message);
        return;
      }
      if (session?.id) setJoinIntent(session.id);
      voice.resetConnect();
      await voice.connect();
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Could not join voice");
    } finally {
      setManualJoinBusy(false);
    }
  }, [voice, session?.id, setJoinIntent]);

  const handleRetryConnect = useCallback(async () => {
    setVoiceError("");
    setManualJoinBusy(true);
    try {
      if (session?.id) setJoinIntent(session.id);
      voice.resetConnect();
      await voice.connect();
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Could not join voice");
    } finally {
      setManualJoinBusy(false);
    }
  }, [voice, session?.id, setJoinIntent]);

  const handleCancelRinging = useCallback(async () => {
    if (!session) return;
    setVoiceBusy(true);
    setVoiceError("");
    try {
      await declineDmVoiceCall(session);
      clearJoinIntent();
      setSession(null);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Could not cancel call");
    } finally {
      setVoiceBusy(false);
    }
  }, [session, clearJoinIntent]);

  const handleLeaveVoice = useCallback(async () => {
    setVoiceError("");
    try {
      await voice.leave();
      resetMicPreflight();
      clearJoinIntent();
      setSession(null);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Could not end call");
    }
  }, [voice, resetMicPreflight, clearJoinIntent]);

  if (!myUid || !joinIntentSessionId || !session) return null;

  const isDm = room?.type === CHAT_TYPE_DM;
  const isCallee = isDm && session.status === "ringing" && session.calleeUid === myUid;
  const isCallerRinging = isDm && session.status === "ringing" && session.createdBy === myUid;
  const inActiveCall = session.status === "active" && callParty;

  const phase: VoiceCallPhase = (() => {
    if (isCallerRinging) return "ringing-caller";
    if (isCallee) return "ringing-callee";
    if (voice.connected) return "connected";
    if (voice.connecting) return "connecting";
    if (inActiveCall || (session.status === "active" && callParty)) return "join-ready";
    return "idle";
  })();

  const showBar =
    phase !== "idle" ||
    voice.connected ||
    voice.connecting ||
    voice.leaving ||
    Boolean(voice.error || voiceError);

  if (!showBar) return null;

  const leaveButtonLabel = session.voiceType === VOICE_TYPE_DM ? "End call" : "Leave call";

  return (
    <FloatingVoiceCallBar
      phase={phase}
      connected={voice.connected}
      connecting={voice.connecting}
      leaving={voice.leaving}
      muted={voice.muted}
      participants={voice.participants}
      error={voice.error || voiceError}
      needsAudioUnlock={voice.needsAudioUnlock}
      needsJoin={voice.needsJoin}
      needsManualJoin={voice.needsManualJoin}
      connectFailed={voice.connectFailed}
      manualJoinBusy={manualJoinBusy}
      voiceBusy={voiceBusy}
      voiceLocked={room?.voiceLocked}
      onCancelRinging={() => void handleCancelRinging()}
      onToggleMute={voice.toggleMute}
      onLeave={handleLeaveVoice}
      onUnlockAudio={voice.unlockAudio}
      onManualJoin={() => void handleManualJoin()}
      onRetryConnect={() => void handleRetryConnect()}
      audioContainerRef={voice.audioContainerRef}
      label={callLabel}
      micVolumePercent={voice.micVolumePercent}
      speakerVolumePercent={voice.speakerVolumePercent}
      onMicVolumeChange={voice.setMicVolumePercent}
      onSpeakerVolumeChange={voice.setSpeakerVolumePercent}
      leaveButtonLabel={leaveButtonLabel}
    />
  );
}
