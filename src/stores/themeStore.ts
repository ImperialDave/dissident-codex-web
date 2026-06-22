"use client";

import { create } from "zustand";
import { THEMES, type ThemeId } from "@/lib/constants";
import { safeLocalStorage } from "@/lib/utils";

interface ThemeState {
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeId: "midnight",
  setTheme: (id) => {
    safeLocalStorage.setItem("codex_theme", id);
    set({ themeId: id });
    applyTheme(id);
  },
  init: () => {
    const saved = (safeLocalStorage.getItem("codex_theme") as ThemeId) || "midnight";
    set({ themeId: saved });
    applyTheme(saved);
  },
}));

function applyTheme(id: ThemeId) {
  const theme = THEMES.find((t) => t.id === id) || THEMES[0];
  const root = document.documentElement;
  root.style.setProperty("--color-primary", theme.primary);
  root.style.setProperty("--color-surface", theme.surface);
  root.style.setProperty("--color-accent", theme.accent);
  root.dataset.theme = id;
}
