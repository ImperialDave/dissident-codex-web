"use client";

import { create } from "zustand";

interface VoiceUiState {
  micPreflightGranted: boolean;
  showMicDeniedDialog: boolean;
  joinIntentSessionId: string | null;
  setMicPreflightGranted: (granted: boolean) => void;
  setShowMicDeniedDialog: (show: boolean) => void;
  setJoinIntent: (sessionId: string | null) => void;
  clearJoinIntent: () => void;
  resetMicPreflight: () => void;
}

export const useVoiceUiStore = create<VoiceUiState>((set) => ({
  micPreflightGranted: false,
  showMicDeniedDialog: false,
  joinIntentSessionId: null,

  setMicPreflightGranted: (granted) => set({ micPreflightGranted: granted }),

  setShowMicDeniedDialog: (show) => set({ showMicDeniedDialog: show }),

  setJoinIntent: (sessionId) => set({ joinIntentSessionId: sessionId }),

  clearJoinIntent: () => set({ joinIntentSessionId: null }),

  resetMicPreflight: () =>
    set({
      micPreflightGranted: false,
      showMicDeniedDialog: false,
    }),
}));