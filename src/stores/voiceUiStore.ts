"use client";

import { create } from "zustand";

interface VoiceUiState {
  micPreflightGranted: boolean;
  showMicDeniedDialog: boolean;
  setMicPreflightGranted: (granted: boolean) => void;
  setShowMicDeniedDialog: (show: boolean) => void;
  resetMicPreflight: () => void;
}

export const useVoiceUiStore = create<VoiceUiState>((set) => ({
  micPreflightGranted: false,
  showMicDeniedDialog: false,

  setMicPreflightGranted: (granted) => set({ micPreflightGranted: granted }),

  setShowMicDeniedDialog: (show) => set({ showMicDeniedDialog: show }),

  resetMicPreflight: () =>
    set({
      micPreflightGranted: false,
      showMicDeniedDialog: false,
    }),
}));
