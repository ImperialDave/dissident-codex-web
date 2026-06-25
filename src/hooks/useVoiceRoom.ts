"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type LocalParticipant,
  type RemoteTrack,
} from "livekit-client";
import { mapCallableError } from "@/lib/utils";
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

function attachRemoteAudio(track: RemoteTrack, container: HTMLElement | null) {
  if (track.kind !== Track.Kind.Audio || !container) return;
  const el = track.attach();
  el.setAttribute("data-livekit-audio", track.sid ?? "remote-audio");
  container.appendChild(el);
}

export function useVoiceRoom({ session, displayName, enabled }: UseVoiceRoomOptions) {
  const roomRef = useRef<Room | null>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const leavingRef = useRef(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [participants, setParticipants] = useState<VoiceParticipantInfo[]>([]);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);

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

  const clearAudioElements = useCallback(() => {
    audioContainerRef.current?.querySelectorAll("[data-livekit-audio]").forEach((el) => el.remove());
  }, []);

  const disconnect = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      room.removeAllListeners();
      await room.disconnect();
    }
    clearAudioElements();
    setConnected(false);
    setConnecting(false);
    setParticipants([]);
    setNeedsAudioUnlock(false);
  }, [clearAudioElements]);

  const unlockAudio = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.startAudio();
      setNeedsAudioUnlock(false);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable audio playback");
    }
  }, []);

  const connect = useCallback(async () => {
    const activeSession = sessionRef.current;
    if (!activeSession || activeSession.status !== "active" || !enabled || leavingRef.current) return;
    if (roomRef.current || connecting) return;

    setConnecting(true);
    setError("");
    try {
      const { token, url } = await fetchVoiceToken(activeSession.id, displayName);
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
      room.on(RoomEvent.TrackSubscribed, (track) => {
        attachRemoteAudio(track, audioContainerRef.current);
        refreshParticipants(room);
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove());
        refreshParticipants(room);
      });

      await room.connect(url, token, { autoSubscribe: true });
      await room.localParticipant.setMicrophoneEnabled(true);
      setMuted(false);
      refreshParticipants(room);

      try {
        await room.startAudio();
        setNeedsAudioUnlock(false);
      } catch {
        setNeedsAudioUnlock(true);
      }
    } catch (err) {
      setError(mapCallableError(err));
      setConnecting(false);
      await disconnect();
    }
  }, [displayName, enabled, connecting, disconnect, refreshParticipants]);

  useEffect(() => {
    if (leavingRef.current) return;
    if (enabled && session?.status === "active") {
      void connect();
      return;
    }
    if (!enabled || session?.status === "ended" || !session) {
      void disconnect();
    }
  }, [enabled, session?.id, session?.status, connect, disconnect]);

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !muted;
    await room.localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
    refreshParticipants(room);
  }, [muted, refreshParticipants]);

  const leave = useCallback(async () => {
    const activeSession = sessionRef.current;
    if (!activeSession || leavingRef.current) return;

    leavingRef.current = true;
    setLeaving(true);
    setError("");

    const uid = roomRef.current?.localParticipant.identity;
    await disconnect();

    try {
      if (uid) {
        await markParticipantLeft(activeSession.id, uid).catch(() => {});
      }
      await endVoiceSessionLocal(activeSession);
      try {
        await endVoiceSessionRemote(activeSession.id);
      } catch {
        // Remote LiveKit cleanup is best-effort; Firestore end is authoritative.
      }
    } catch (err) {
      setError(mapCallableError(err));
    } finally {
      leavingRef.current = false;
      setLeaving(false);
    }
  }, [disconnect]);

  return {
    connected,
    connecting,
    leaving,
    muted,
    error,
    participants,
    needsAudioUnlock,
    toggleMute,
    leave,
    unlockAudio,
    connect,
    disconnect,
    audioContainerRef,
  };
}