"use client";

import { create } from "zustand";
import type { VoiceSession } from "@/models";

interface IncomingCallState {
  session: VoiceSession | null;
  callerName: string;
  callerPhotoUrl: string | null;
  dismissed: boolean;
  busy: boolean;
  listenerError: string | null;
  setIncoming: (session: VoiceSession | null) => void;
  setCaller: (name: string, photoUrl: string | null) => void;
  dismiss: () => void;
  expand: () => void;
  clear: () => void;
  setBusy: (busy: boolean) => void;
  setListenerError: (error: string | null) => void;
}

export const useIncomingCallStore = create<IncomingCallState>((set) => ({
  session: null,
  callerName: "Someone",
  callerPhotoUrl: null,
  dismissed: false,
  busy: false,
  listenerError: null,

  setIncoming: (session) =>
    set((state) => ({
      session,
      dismissed: session ? state.dismissed : false,
    })),

  setCaller: (callerName, callerPhotoUrl) => set({ callerName, callerPhotoUrl }),

  dismiss: () => set({ dismissed: true }),

  expand: () => set({ dismissed: false }),

  clear: () =>
    set({
      session: null,
      callerName: "Someone",
      callerPhotoUrl: null,
      dismissed: false,
      busy: false,
    }),

  setBusy: (busy) => set({ busy }),

  setListenerError: (listenerError) => set({ listenerError }),
}));
