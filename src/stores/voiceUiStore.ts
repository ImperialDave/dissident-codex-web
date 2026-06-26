"use client";

import { create } from "zustand";
import {
  VOICE_VOLUME_DEFAULT_PERCENT,
  clampVoiceVolumePercent,
} from "@/lib/voiceVolume";
import type { ChatRoom } from "@/models";

type StartDmCallFn = (room: ChatRoom) => Promise<void>;
type JoinChannelVoiceFn = (room: ChatRoom) => Promise<void>;

interface VoiceUiState {
  micPreflightGranted: boolean;
  showMicDeniedDialog: boolean;
  joinIntentSessionId: string | null;
  micVolumePercent: number;
  speakerVolumePercent: number;
  startDmCall: StartDmCallFn | null;
  joinChannelVoice: JoinChannelVoiceFn | null;
  setMicPreflightGranted: (granted: boolean) => void;
  setMicVolumePercent: (percent: number) => void;
  setSpeakerVolumePercent: (percent: number) => void;
  setShowMicDeniedDialog: (show: boolean) => void;
  setJoinIntent: (sessionId: string | null) => void;
  clearJoinIntent: () => void;
  resetMicPreflight: () => void;
  registerVoiceActions: (actions: {
    startDmCall: StartDmCallFn;
    joinChannelVoice: JoinChannelVoiceFn;
  }) => void;
  unregisterVoiceActions: () => void;
}

export const useVoiceUiStore = create<VoiceUiState>((set) => ({
  micPreflightGranted: false,
  showMicDeniedDialog: false,
  joinIntentSessionId: null,
  micVolumePercent: VOICE_VOLUME_DEFAULT_PERCENT,
  speakerVolumePercent: VOICE_VOLUME_DEFAULT_PERCENT,
  startDmCall: null,
  joinChannelVoice: null,

  setMicPreflightGranted: (granted) => set({ micPreflightGranted: granted }),

  setShowMicDeniedDialog: (show) => set({ showMicDeniedDialog: show }),

  setJoinIntent: (sessionId) => set({ joinIntentSessionId: sessionId }),

  clearJoinIntent: () =>
    set({
      joinIntentSessionId: null,
      micVolumePercent: VOICE_VOLUME_DEFAULT_PERCENT,
      speakerVolumePercent: VOICE_VOLUME_DEFAULT_PERCENT,
    }),

  setMicVolumePercent: (percent) =>
    set({ micVolumePercent: clampVoiceVolumePercent(percent) }),

  setSpeakerVolumePercent: (percent) =>
    set({ speakerVolumePercent: clampVoiceVolumePercent(percent) }),

  resetMicPreflight: () =>
    set({
      micPreflightGranted: false,
      showMicDeniedDialog: false,
    }),

  registerVoiceActions: (actions) =>
    set({
      startDmCall: actions.startDmCall,
      joinChannelVoice: actions.joinChannelVoice,
    }),

  unregisterVoiceActions: () =>
    set({
      startDmCall: null,
      joinChannelVoice: null,
    }),
}));
