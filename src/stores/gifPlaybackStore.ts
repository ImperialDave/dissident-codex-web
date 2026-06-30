"use client";

import { create } from "zustand";

const STORAGE_KEY = "codex_autoplay_gifs";

interface GifPlaybackState {
  autoplayGifs: boolean;
  setAutoplayGifs: (value: boolean) => void;
  toggleAutoplayGifs: () => void;
  init: () => void;
}

export const useGifPlaybackStore = create<GifPlaybackState>((set, get) => ({
  autoplayGifs: true,
  setAutoplayGifs: (value) => {
    localStorage.setItem(STORAGE_KEY, String(value));
    set({ autoplayGifs: value });
  },
  toggleAutoplayGifs: () => {
    get().setAutoplayGifs(!get().autoplayGifs);
  },
  init: () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      set({ autoplayGifs: saved === "true" });
      return;
    }
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    set({ autoplayGifs: !prefersReduced });
  },
}));
