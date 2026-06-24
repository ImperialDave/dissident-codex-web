"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type LocalParticipant,
} from "livekit-client";
import {
  endVoiceSessionLocal,
  endVoiceSessionRemote,
  fetchVoiceToken,
  markParticipantLeft,
} from "@/services/voiceService";
import type { VoiceSession } from "@/models";

export interface VoiceParticipantInfo {
  identity: string;
  name: string;
  isLocal: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
}

interface UseVoiceRoomOptions {
  session: VoiceSession | null;
  displayName: string;
  enabled: boolean;
}

export function useVoiceRoom({ session, displayName, enabled }: UseVoiceRoomOptions) {
  const roomRef = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [participants, setParticipants] = useState<VoiceParticipantInfo[]>([]);

  const refreshParticipants = useCallback((room: Room) => {
    const list: VoiceParticipantInfo[] = [];
    const add = (p: LocalParticipant | RemoteParticipant, isLocal: boolean) => {
      const mic = p.getTrackPublication(Track.Source.Microphone);
      list.push({
        identity: p.identity,
        name: p.name || p.identity,
        isLocal,
        isSpeaking: p.isSpeaking,
        isMuted: mic?.isMuted ?? !mic?.track,
      });
    };
    add(room.localParticipant, true);
    room.remoteParticipants.forEach((p) => add(p, false));
    setParticipants(list);
  }, []);

  const disconnect = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      room.removeAllListeners();
      await room.disconnect();
    }
    setConnected(false);
    setConnecting(false);
    setParticipants([]);
  }, []);

  const connect = useCallback(async () => {
    if (!session || session.status !== "active" || !enabled) return;
    if (roomRef.current || connecting) return;

    setConnecting(true);
    setError("");
    try {
      const { token, url } = await fetchVoiceToken(session.id, displayName);
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      room.on(RoomEvent.Connected, () => {
        setConnected(true);
        setConnecting(false);
        refreshParticipants(room);
      });
      room.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setConnecting(false);
      });
      room.on(RoomEvent.ParticipantConnected, () => refreshParticipants(room));
      room.on(RoomEvent.ParticipantDisconnected, () => refreshParticipants(room));
      room.on(RoomEvent.ActiveSpeakersChanged, () => refreshParticipants(room));
      room.on(RoomEvent.TrackMuted, () => refreshParticipants(room));
      room.on(RoomEvent.TrackUnmuted, () => refreshParticipants(room));

      await room.connect(url, token);
      await room.localParticipant.setMicrophoneEnabled(true);
      setMuted(false);
      refreshParticipants(room);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join voice");
      setConnecting(false);
      await disconnect();
    }
  }, [session, displayName, enabled, connecting, disconnect, refreshParticipants]);

  useEffect(() => {
    if (enabled && session?.status === "active") {
      connect();
    }
    if (!enabled || session?.status === "ended") {
      disconnect();
    }
    return () => {
      disconnect();
    };
  }, [enabled, session?.id, session?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !muted;
    await room.localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
    refreshParticipants(room);
  }, [muted, refreshParticipants]);

  const leave = useCallback(async () => {
    const uid = roomRef.current?.localParticipant.identity;
    await disconnect();
    if (session && uid) {
      await markParticipantLeft(session.id, uid).catch(() => {});
      const participantCount = Object.keys(session.participants).length;
      if (participantCount <= 1) {
        await endVoiceSessionRemote(session.id).catch(() => endVoiceSessionLocal(session));
      } else {
        await endVoiceSessionLocal(session).catch(() => {});
      }
    }
  }, [session, disconnect]);

  return {
    connected,
    connecting,
    muted,
    error,
    participants,
    toggleMute,
    leave,
    connect,
    disconnect,
  };
}
