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
import { mapMicrophoneConnectError } from "@/lib/microphonePermission";
import {
  applyMicVolumeToRoom,
  applySpeakerVolumeToRoom,
  teardownMicGainPipeline,
} from "@/lib/voiceVolume";
import { mapCallableError, sanitizeUserError } from "@/lib/utils";
import { useVoiceUiStore } from "@/stores/voiceUiStore";
import {
  endVoiceSessionLocal,
  endVoiceSessionRemote,
  fetchVoiceToken,
  isDmVoiceSession,
  leaveVoiceSession,
} from "@/services/voiceService";
import type { VoiceSession } from "@/models";

const CONNECT_TIMEOUT_MS = 20_000;

export type VoiceConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed";

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
  /** Stable intent to join LiveKit — must not flicker on transient Firestore updates. */
  shouldConnect: boolean;
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

export function useVoiceRoom({ session, displayName, shouldConnect }: UseVoiceRoomOptions) {
  const micPreflightGranted = useVoiceUiStore((s) => s.micPreflightGranted);
  const micVolumePercent = useVoiceUiStore((s) => s.micVolumePercent);
  const speakerVolumePercent = useVoiceUiStore((s) => s.speakerVolumePercent);
  const setMicVolumePercent = useVoiceUiStore((s) => s.setMicVolumePercent);
  const setSpeakerVolumePercent = useVoiceUiStore((s) => s.setSpeakerVolumePercent);
  const [room] = useState(
    () =>
      new Room({
        adaptiveStream: true,
        dynacast: true,
        webAudioMix: true,
      })
  );
  const roomRef = useRef(room);
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const leavingRef = useRef(false);
  const suppressConnectRef = useRef(false);
  const connectingRef = useRef(false);
  const connectFailedRef = useRef(false);
  const listenersBoundRef = useRef(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [connectFailed, setConnectFailed] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipantInfo[]>([]);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);

  const refreshParticipants = useCallback((activeRoom: Room) => {
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
    add(activeRoom.localParticipant, true);
    activeRoom.remoteParticipants.forEach((p) => add(p, false));
    setParticipants(list);
  }, []);

  const clearAudioElements = useCallback(() => {
    audioContainerRef.current?.querySelectorAll("[data-livekit-audio]").forEach((el) => el.remove());
  }, []);

  const bindRoomListeners = useCallback(
    (activeRoom: Room) => {
      if (listenersBoundRef.current) return;
      listenersBoundRef.current = true;

      activeRoom.on(RoomEvent.Connected, () => {
        setConnected(true);
        setConnecting(false);
        connectingRef.current = false;
        refreshParticipants(activeRoom);
      });
      activeRoom.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setConnecting(false);
        connectingRef.current = false;
      });
      activeRoom.on(RoomEvent.ParticipantConnected, () => refreshParticipants(activeRoom));
      activeRoom.on(RoomEvent.ParticipantDisconnected, () => refreshParticipants(activeRoom));
      activeRoom.on(RoomEvent.ActiveSpeakersChanged, () => refreshParticipants(activeRoom));
      activeRoom.on(RoomEvent.TrackMuted, () => refreshParticipants(activeRoom));
      activeRoom.on(RoomEvent.TrackUnmuted, () => refreshParticipants(activeRoom));
      activeRoom.on(RoomEvent.TrackSubscribed, (track) => {
        attachRemoteAudio(track, audioContainerRef.current);
        applySpeakerVolumeToRoom(activeRoom, useVoiceUiStore.getState().speakerVolumePercent);
        refreshParticipants(activeRoom);
      });
      activeRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove());
        refreshParticipants(activeRoom);
      });
    },
    [refreshParticipants]
  );

  const disconnect = useCallback(async () => {
    connectingRef.current = false;
    const activeRoom = roomRef.current;
    if (activeRoom.state === "disconnected") {
      setConnected(false);
      setConnecting(false);
      setParticipants([]);
      setNeedsAudioUnlock(false);
      return;
    }
    try {
      await activeRoom.disconnect();
    } catch {
      // Best-effort teardown.
    }
    clearAudioElements();
    teardownMicGainPipeline();
    setConnected(false);
    setConnecting(false);
    setParticipants([]);
    setNeedsAudioUnlock(false);
  }, [clearAudioElements]);

  const unlockAudio = useCallback(async () => {
    const activeRoom = roomRef.current;
    if (!activeRoom) return;
    try {
      await activeRoom.startAudio();
      setNeedsAudioUnlock(false);
      setError("");
    } catch (err) {
      setError(sanitizeUserError(err, "Could not enable audio playback"));
    }
  }, []);

  const connect = useCallback(async () => {
    const activeSession = sessionRef.current;
    if (
      !activeSession ||
      activeSession.status !== "active" ||
      !shouldConnect ||
      leavingRef.current ||
      suppressConnectRef.current
    ) {
      return;
    }
    if (connectingRef.current || roomRef.current.state === "connected") return;

    connectingRef.current = true;
    setConnecting(true);
    setError("");
    setConnectFailed(false);
    connectFailedRef.current = false;

    const activeRoom = roomRef.current;
    bindRoomListeners(activeRoom);

    try {
      const { token, url } = await fetchVoiceToken(activeSession.id, displayName);

      await withTimeout(
        activeRoom.connect(url, token, { autoSubscribe: true }),
        CONNECT_TIMEOUT_MS,
        "Voice connection timed out. Check microphone permission and try again."
      );
      try {
        await activeRoom.localParticipant.setMicrophoneEnabled(true);
      } catch (micErr) {
        useVoiceUiStore.getState().setMicPreflightGranted(false);
        throw new Error(mapMicrophoneConnectError(micErr));
      }
      setMuted(false);
      setConnected(true);
      setConnecting(false);
      connectingRef.current = false;
      connectFailedRef.current = false;
      setConnectFailed(false);
      refreshParticipants(activeRoom);

      try {
        await activeRoom.startAudio();
        setNeedsAudioUnlock(false);
      } catch {
        setNeedsAudioUnlock(true);
      }

      const { micVolumePercent: micVol, speakerVolumePercent: speakerVol } =
        useVoiceUiStore.getState();
      await applyMicVolumeToRoom(activeRoom, micVol);
      applySpeakerVolumeToRoom(activeRoom, speakerVol);
    } catch (err) {
      connectFailedRef.current = true;
      setConnectFailed(true);
      setError(mapCallableError(err));
      setConnecting(false);
      connectingRef.current = false;
      await disconnect();
    }
  }, [displayName, shouldConnect, disconnect, refreshParticipants, bindRoomListeners]);

  useEffect(() => {
    connectFailedRef.current = false;
    setConnectFailed(false);
    setError("");
  }, [session?.id]);

  useEffect(() => {
    if (leavingRef.current || suppressConnectRef.current) return;

    if (!session || session.status === "ended") {
      void disconnect();
      if (!session || session.status === "ended") {
        useVoiceUiStore.getState().resetMicPreflight();
        useVoiceUiStore.getState().clearJoinIntent();
      }
      return;
    }

    if (
      shouldConnect &&
      session.status === "active" &&
      micPreflightGranted &&
      !connectFailedRef.current &&
      !connected &&
      !connectingRef.current
    ) {
      void connect();
    }
  }, [
    shouldConnect,
    session?.id,
    session?.status,
    micPreflightGranted,
    connected,
    connect,
    disconnect,
  ]);

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  useEffect(() => {
    if (!connected) return;
    const activeRoom = roomRef.current;
    if (activeRoom.state !== "connected") return;
    void applyMicVolumeToRoom(activeRoom, micVolumePercent);
  }, [connected, micVolumePercent]);

  useEffect(() => {
    if (!connected) return;
    const activeRoom = roomRef.current;
    if (activeRoom.state !== "connected") return;
    applySpeakerVolumeToRoom(activeRoom, speakerVolumePercent);
  }, [connected, speakerVolumePercent]);

  const toggleMute = useCallback(async () => {
    const activeRoom = roomRef.current;
    if (!activeRoom || activeRoom.state !== "connected") return;
    const next = !muted;
    await activeRoom.localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
    refreshParticipants(activeRoom);
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
      if (isDmVoiceSession(activeSession)) {
        await endVoiceSessionLocal(activeSession);
        try {
          await endVoiceSessionRemote(activeSession.id);
        } catch {
          // LiveKit cleanup is best-effort.
        }
      } else {
        await leaveVoiceSession(activeSession);
      }
    } catch (err) {
      setError(mapCallableError(err));
    } finally {
      leavingRef.current = false;
      suppressConnectRef.current = false;
      setLeaving(false);
      useVoiceUiStore.getState().clearJoinIntent();
    }
  }, [disconnect]);

  const resetConnect = useCallback(() => {
    connectFailedRef.current = false;
    setConnectFailed(false);
    suppressConnectRef.current = false;
    setError("");
  }, []);

  const needsJoin =
    shouldConnect &&
    session?.status === "active" &&
    !connected &&
    !connecting &&
    !leaving;

  const needsManualJoin = needsJoin && !micPreflightGranted;
  const needsAutoJoin = needsJoin && micPreflightGranted && !connectFailed;

  const connectionState: VoiceConnectionState = (() => {
    if (leaving) return "disconnected";
    if (connectFailed && !connected) return "failed";
    if (connecting) return "connecting";
    if (connected) return "connected";
    if (shouldConnect && session?.status === "active") return "disconnected";
    return "idle";
  })();

  return {
    connected,
    connecting,
    leaving,
    muted,
    error,
    connectFailed,
    connectionState,
    participants,
    needsAudioUnlock,
    needsJoin,
    needsManualJoin,
    needsAutoJoin,
    toggleMute,
    leave,
    unlockAudio,
    resetConnect,
    connect,
    disconnect,
    audioContainerRef,
    micVolumePercent,
    speakerVolumePercent,
    setMicVolumePercent,
    setSpeakerVolumePercent,
  };
}
