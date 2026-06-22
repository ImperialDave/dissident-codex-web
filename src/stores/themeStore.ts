"use client";

import { create } from "zustand";
import { THEMES, type ThemeId } from "@/lib/constants";

interface ThemeState {
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeId: "midnight",
  setTheme: (id) => {
    localStorage.setItem("codex_theme", id);
    set({ themeId: id });
    applyTheme(id);
  },
  init: () => {
    const saved = (localStorage.getItem("codex_theme") as ThemeId) || "midnight";
    set({ themeId: saved });
    applyTheme(saved);
  },
}));

function applyTheme(id: ThemeId) {
  const theme = THEMES.find((t) => t.id === id) || THEMES[0]!;
  const root = document.documentElement;
  root.style.setProperty("--color-primary", theme.primary);
  root.style.setProperty("--color-surface", theme.surface);
  root.style.setProperty("--color-accent", theme.accent);
  root.style.setProperty("--color-accent-alt", theme.accentAlt);
  root.style.setProperty("--color-bg-gradient", theme.bgGradient);
  root.style.setProperty("--color-surface-gradient", theme.surfaceGradient);
  root.style.setProperty("--color-accent-gradient", theme.accentGradient);
  root.style.setProperty("--color-border", theme.border);
  root.style.setProperty("--color-text-glow", theme.textGlow);
  root.style.setProperty(
    "--color-header-bg",
    `linear-gradient(180deg, ${theme.primary}ee, ${theme.primary}cc)`
  );
  root.dataset.theme = id;
}
