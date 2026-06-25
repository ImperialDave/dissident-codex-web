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
} from "@/services/voiceService";
import type { VoiceSession } from "@/models";

const CONNECT_TIMEOUT_MS = 20_000;

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

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function useVoiceRoom({ session, displayName, enabled }: UseVoiceRoomOptions) {
  const roomRef = useRef<Room | null>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const leavingRef = useRef(false);
  const suppressConnectRef = useRef(false);
  const connectingRef = useRef(false);
  const connectFailedRef = useRef(false);
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
    connectingRef.current = false;
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
    if (
      !activeSession ||
      activeSession.status !== "active" ||
      !enabled ||
      leavingRef.current ||
      suppressConnectRef.current ||
      connectFailedRef.current
    ) {
      return;
    }
    if (roomRef.current || connectingRef.current) return;

    connectingRef.current = true;
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
        connectingRef.current = false;
        refreshParticipants(room);
      });
      room.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setConnecting(false);
        connectingRef.current = false;
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

      await withTimeout(
        room.connect(url, token, { autoSubscribe: true }),
        CONNECT_TIMEOUT_MS,
        "Voice connection timed out. Check microphone permission and try again."
      );
      await room.localParticipant.setMicrophoneEnabled(true);
      setMuted(false);
      setConnected(true);
      setConnecting(false);
      connectingRef.current = false;
      connectFailedRef.current = false;
      refreshParticipants(room);

      try {
        await room.startAudio();
        setNeedsAudioUnlock(false);
      } catch {
        setNeedsAudioUnlock(true);
      }
    } catch (err) {
      connectFailedRef.current = true;
      setError(mapCallableError(err));
      setConnecting(false);
      connectingRef.current = false;
      await disconnect();
    }
  }, [displayName, enabled, disconnect, refreshParticipants]);

  useEffect(() => {
    if (session?.status === "ended") {
      suppressConnectRef.current = false;
      connectFailedRef.current = false;
    }
  }, [session?.status]);

  useEffect(() => {
    if (leavingRef.current || suppressConnectRef.current) return;
    if (enabled && session?.status === "active" && !connectFailedRef.current) {
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
    suppressConnectRef.current = true;
    setLeaving(true);
    setError("");

    await disconnect();

    try {
      await endVoiceSessionLocal(activeSession);
      try {
        await endVoiceSessionRemote(activeSession.id);
      } catch {
        // LiveKit cleanup is best-effort.
      }
    } catch (err) {
      setError(mapCallableError(err));
    } finally {
      leavingRef.current = false;
      setLeaving(false);
    }
  }, [disconnect]);

  const resetConnect = useCallback(() => {
    connectFailedRef.current = false;
    suppressConnectRef.current = false;
    setError("");
  }, []);

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
    resetConnect,
    connect,
    disconnect,
    audioContainerRef,
  };
}
