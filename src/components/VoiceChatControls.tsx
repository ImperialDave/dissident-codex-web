"use client";

import { useEffect, useState } from "react";
import { useVoiceUiStore } from "@/stores/voiceUiStore";
import { getActiveVoiceSessionForRoom, listenVoiceSession } from "@/services/voiceService";
import { CHAT_TYPE_DM, CHAT_TYPE_GROUP, CHAT_TYPE_TOPIC, type ChatRoom, type VoiceSession } from "@/models";

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
  myUid: string | undefined;
}

export function VoiceChatControls({ room, roomId, myUid }: VoiceChatControlsProps) {
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const joinIntentSessionId = useVoiceUiStore((s) => s.joinIntentSessionId);
  const startDmCall = useVoiceUiStore((s) => s.startDmCall);
  const joinChannelVoice = useVoiceUiStore((s) => s.joinChannelVoice);

  useEffect(() => {
    if (!roomId) return;
    getActiveVoiceSessionForRoom(roomId).then((next) => setSession(toUiVoiceSession(next)));
  }, [roomId]);

  useEffect(() => {
    const listenId = room?.activeVoiceSessionId;
    if (!listenId) return;
    return listenVoiceSession(listenId, (next) => setSession(toUiVoiceSession(next)));
  }, [room?.activeVoiceSessionId]);

  if (!room || !myUid) return null;

  const handledGlobally =
    Boolean(joinIntentSessionId) &&
    (joinIntentSessionId === session?.id || joinIntentSessionId === room.activeVoiceSessionId);

  if (handledGlobally) return null;

  const isDm = room.type === CHAT_TYPE_DM;
  const isChannel = room.type === CHAT_TYPE_TOPIC || room.type === CHAT_TYPE_GROUP;
  const callParty = Boolean(session && isCallParty(session, myUid, joinIntentSessionId));
  const inActiveCall = session?.status === "active" && callParty;
  const voiceLocked = room.voiceLocked;

  const showIdleDmButton = isDm && !session;
  const showIdleChannelButton = isChannel && !inActiveCall && !session;
  const showChannelRejoin = session?.status === "active" && !callParty && isChannel;

  if (!showIdleDmButton && !showIdleChannelButton && !showChannelRejoin && !voiceError) {
    return null;
  }

  async function handleStartDmCall() {
    if (!startDmCall) return;
    setVoiceError("");
    setVoiceBusy(true);
    try {
      await startDmCall(room!);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Could not start call");
    } finally {
      setVoiceBusy(false);
    }
  }

  async function handleJoinChannel() {
    if (!joinChannelVoice) return;
    setVoiceError("");
    setVoiceBusy(true);
    try {
      await joinChannelVoice(room!);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Could not join voice");
    } finally {
      setVoiceBusy(false);
    }
  }

  return (
    <div className="border-b border-[var(--color-border)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        {showIdleDmButton && (
          <button
            type="button"
            onClick={() => void handleStartDmCall()}
            disabled={voiceBusy || voiceLocked || !startDmCall}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-50"
          >
            {voiceBusy ? "Calling..." : "Voice call"}
          </button>
        )}
        {showIdleChannelButton && (
          <button
            type="button"
            onClick={() => void handleJoinChannel()}
            disabled={voiceBusy || voiceLocked || !joinChannelVoice}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-50"
          >
            {voiceBusy ? "Joining..." : "Join voice"}
          </button>
        )}
        {showChannelRejoin && (
          <button
            type="button"
            onClick={() => void handleJoinChannel()}
            disabled={voiceBusy || !joinChannelVoice}
            className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-sm text-emerald-200 disabled:opacity-50"
          >
            Rejoin voice
          </button>
        )}
        {voiceLocked && (showIdleDmButton || showIdleChannelButton) && (
          <span className="text-xs text-orange-300">Voice locked</span>
        )}
        {voiceError && <p className="text-xs text-red-300">{voiceError}</p>}
      </div>
    </div>
  );
}
