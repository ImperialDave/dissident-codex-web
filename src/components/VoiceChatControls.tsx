"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { VoiceCallBar, type VoiceCallPhase } from "@/components/VoiceCallBar";
import { useVoiceRoom } from "@/hooks/useVoiceRoom";
import { ensureMicrophoneForVoice } from "@/lib/microphonePermission";
import { useVoiceUiStore } from "@/stores/voiceUiStore";
import {
  declineDmVoiceCall,
  getActiveVoiceSessionForRoom,
  joinTopicOrGroupVoice,
  listenVoiceSession,
  startDmVoiceCall,
} from "@/services/voiceService";
import { CHAT_TYPE_DM, CHAT_TYPE_GROUP, CHAT_TYPE_TOPIC, type ChatRoom, type VoiceSession } from "@/models";

/** Ended sessions are treated as idle so the Voice call button can return without a refresh. */
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

interface VoiceChatControlsProps {
  room: ChatRoom | null;
  roomId: string;
  displayName: string;
  myUid: string | undefined;
  panelRef?: RefObject<HTMLDivElement>;
}

export function VoiceChatControls({ room, roomId, displayName, myUid, panelRef }: VoiceChatControlsProps) {
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [manualJoinBusy, setManualJoinBusy] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const resetMicPreflight = useVoiceUiStore((s) => s.resetMicPreflight);
  const setJoinIntent = useVoiceUiStore((s) => s.setJoinIntent);
  const clearJoinIntent = useVoiceUiStore((s) => s.clearJoinIntent);
  const joinIntentSessionId = useVoiceUiStore((s) => s.joinIntentSessionId);
  const prevStatusRef = useRef<string | null>(null);

  const listenSessionId = session?.id ?? room?.activeVoiceSessionId ?? null;

  const callParty =
    Boolean(session && myUid && isCallParty(session, myUid, joinIntentSessionId));

  const shouldConnect = Boolean(session?.status === "active" && callParty);

  const voice = useVoiceRoom({
    session,
    displayName,
    shouldConnect,
  });

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
    if (!roomId) return;
    getActiveVoiceSessionForRoom(roomId).then(applySession);
  }, [roomId, applySession]);

  useEffect(() => {
    if (!listenSessionId) return;
    return listenVoiceSession(listenSessionId, applySession);
  }, [listenSessionId, applySession]);

  useEffect(() => {
    const becameActive =
      session?.status === "active" &&
      prevStatusRef.current !== "active" &&
      callParty;
    if (becameActive) {
      panelRef?.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    prevStatusRef.current = session?.status ?? null;
  }, [session?.status, callParty, panelRef]);

  async function handleStartDmCall() {
    if (!room) return;
    setVoiceError("");
    const mic = await ensureMicrophoneForVoice();
    if (mic.status !== "granted") {
      if (mic.message && mic.status !== "denied") setVoiceError(mic.message);
      return;
    }

    setVoiceBusy(true);
    try {
      const created = await startDmVoiceCall(room);
      setJoinIntent(created.id);
      setSession(created);
      panelRef?.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Could not start call");
    } finally {
      setVoiceBusy(false);
    }
  }

  async function handleJoinChannel() {
    if (!room) return;
    setVoiceError("");
    const mic = await ensureMicrophoneForVoice();
    if (mic.status !== "granted") {
      if (mic.message && mic.status !== "denied") setVoiceError(mic.message);
      return;
    }

    setVoiceBusy(true);
    voice.resetConnect();
    try {
      const joined = await joinTopicOrGroupVoice(room);
      setJoinIntent(joined.id);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Could not join voice");
    } finally {
      setVoiceBusy(false);
    }
  }

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

  async function handleCancelRinging() {
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
  }

  async function handleLeaveVoice() {
    setVoiceError("");
    try {
      await voice.leave();
      resetMicPreflight();
      clearJoinIntent();
      setSession(null);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Could not end call");
    }
  }

  if (!room || !myUid) return null;

  const isDm = room.type === CHAT_TYPE_DM;
  const isChannel = room.type === CHAT_TYPE_TOPIC || room.type === CHAT_TYPE_GROUP;
  const isCallee = isDm && session?.status === "ringing" && session.calleeUid === myUid;
  const isCallerRinging = isDm && session?.status === "ringing" && session.createdBy === myUid;
  const voiceLocked = room.voiceLocked;
  const inActiveCall = session?.status === "active" && callParty;

  const phase: VoiceCallPhase = (() => {
    if (!session) return "idle";
    if (isCallerRinging) return "ringing-caller";
    if (isCallee) return "ringing-callee";
    if (voice.connected) return "connected";
    if (voice.connecting) return "connecting";
    if (inActiveCall || (session.status === "active" && callParty)) return "join-ready";
    return "idle";
  })();

  const label =
    room.type === CHAT_TYPE_TOPIC ? "Topic voice" : room.type === CHAT_TYPE_GROUP ? "Group voice" : "Call";

  return (
    <div ref={panelRef} className="shrink-0">
      <VoiceCallBar
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
        voiceLocked={voiceLocked}
        showIdleDmButton={isDm && !session}
        showIdleChannelButton={isChannel && !inActiveCall && !session}
        showChannelRejoin={session?.status === "active" && !callParty && isChannel}
        onStartDmCall={() => void handleStartDmCall()}
        onJoinChannel={() => void handleJoinChannel()}
        onCancelRinging={() => void handleCancelRinging()}
        onToggleMute={voice.toggleMute}
        onLeave={handleLeaveVoice}
        onUnlockAudio={voice.unlockAudio}
        onManualJoin={() => void handleManualJoin()}
        onRetryConnect={() => void handleRetryConnect()}
        audioContainerRef={voice.audioContainerRef}
        label={label}
      />
    </div>
  );
}