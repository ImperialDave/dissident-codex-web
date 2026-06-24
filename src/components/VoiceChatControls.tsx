"use client";

import { useEffect, useState } from "react";
import { VoiceCallBar } from "@/components/VoiceCallBar";
import { useVoiceRoom } from "@/hooks/useVoiceRoom";
import {
  acceptDmVoiceCall,
  declineDmVoiceCall,
  getActiveVoiceSessionForRoom,
  joinTopicOrGroupVoice,
  listenVoiceSession,
  startDmVoiceCall,
} from "@/services/voiceService";
import { CHAT_TYPE_DM, CHAT_TYPE_GROUP, CHAT_TYPE_TOPIC, type ChatRoom, type VoiceSession } from "@/models";

interface VoiceChatControlsProps {
  room: ChatRoom | null;
  roomId: string;
  displayName: string;
  myUid: string | undefined;
}

export function VoiceChatControls({ room, roomId, displayName, myUid }: VoiceChatControlsProps) {
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  const inActiveCall =
    session?.status === "active" &&
    Boolean(myUid && session.participants[myUid] && !session.participants[myUid]?.leftAt);

  const voice = useVoiceRoom({
    session,
    displayName,
    enabled: inActiveCall,
  });

  useEffect(() => {
    if (!roomId) return;
    getActiveVoiceSessionForRoom(roomId).then(setSession);
    if (room?.activeVoiceSessionId) {
      return listenVoiceSession(room.activeVoiceSessionId, setSession);
    }
    return undefined;
  }, [roomId, room?.activeVoiceSessionId]);

  useEffect(() => {
    if (!session?.id) return;
    return listenVoiceSession(session.id, setSession);
  }, [session?.id]);

  async function handleStartDmCall() {
    if (!room) return;
    setVoiceBusy(true);
    setVoiceError("");
    try {
      const created = await startDmVoiceCall(room);
      setSession(created);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Could not start call");
    } finally {
      setVoiceBusy(false);
    }
  }

  async function handleJoinChannel() {
    if (!room) return;
    setVoiceBusy(true);
    setVoiceError("");
    try {
      const joined = await joinTopicOrGroupVoice(room);
      setSession(joined);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Could not join voice");
    } finally {
      setVoiceBusy(false);
    }
  }

  async function handleAcceptRinging() {
    if (!session) return;
    setVoiceBusy(true);
    setVoiceError("");
    try {
      await acceptDmVoiceCall(session);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Could not accept call");
    } finally {
      setVoiceBusy(false);
    }
  }

  async function handleDeclineRinging() {
    if (!session) return;
    setVoiceBusy(true);
    try {
      await declineDmVoiceCall(session);
      setSession(null);
    } finally {
      setVoiceBusy(false);
    }
  }

  if (!room || !myUid) return null;

  const isDm = room.type === CHAT_TYPE_DM;
  const isChannel = room.type === CHAT_TYPE_TOPIC || room.type === CHAT_TYPE_GROUP;
  const isCallee = isDm && session?.status === "ringing" && session.calleeUid === myUid;
  const isCallerRinging = isDm && session?.status === "ringing" && session.createdBy === myUid;
  const voiceLocked = room.voiceLocked;

  return (
    <>
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
        {isDm && !session && (
          <button
            type="button"
            onClick={handleStartDmCall}
            disabled={voiceBusy || voiceLocked}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-50"
          >
            {voiceBusy ? "Calling..." : "Voice call"}
          </button>
        )}
        {isChannel && !inActiveCall && (
          <button
            type="button"
            onClick={handleJoinChannel}
            disabled={voiceBusy || voiceLocked}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-50"
          >
            {voiceBusy ? "Joining..." : "Join voice"}
          </button>
        )}
        {voiceLocked && <span className="text-xs text-orange-300">Voice locked</span>}
        {session?.status === "active" && !inActiveCall && isChannel && (
          <button
            type="button"
            onClick={handleJoinChannel}
            disabled={voiceBusy}
            className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-sm text-emerald-200"
          >
            Rejoin voice
          </button>
        )}
        {isCallerRinging && (
          <span className="text-sm text-slate-400">Ringing...</span>
        )}
        {isCallee && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAcceptRinging}
              disabled={voiceBusy}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-black"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={handleDeclineRinging}
              disabled={voiceBusy}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm"
            >
              Decline
            </button>
          </div>
        )}
        {(voiceError || voice.error) && (
          <span className="text-xs text-red-300">{voiceError || voice.error}</span>
        )}
      </div>

      <VoiceCallBar
        connected={voice.connected}
        connecting={voice.connecting}
        muted={voice.muted}
        participants={voice.participants}
        error={voice.error}
        onToggleMute={voice.toggleMute}
        onLeave={voice.leave}
        label={room.type === CHAT_TYPE_TOPIC ? "Topic voice" : room.type === CHAT_TYPE_GROUP ? "Group voice" : "Call"}
      />
    </>
  );
}
