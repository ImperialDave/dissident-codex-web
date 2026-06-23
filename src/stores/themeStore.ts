"use client";

import { create } from "zustand";
import { THEMES, type Theme, type ThemeId } from "@/lib/constants";

export type ColorMode = "dark" | "light";

interface ThemeState {
  themeId: ThemeId;
  colorMode: ColorMode;
  setTheme: (id: ThemeId) => void;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeId: "midnight",
  colorMode: "dark",
  setTheme: (id) => {
    localStorage.setItem("codex_theme", id);
    set({ themeId: id });
    applyTheme(id, get().colorMode);
  },
  setColorMode: (mode) => {
    localStorage.setItem("codex_color_mode", mode);
    set({ colorMode: mode });
    applyTheme(get().themeId, mode);
  },
  toggleColorMode: () => {
    const next = get().colorMode === "dark" ? "light" : "dark";
    get().setColorMode(next);
  },
  init: () => {
    const savedTheme = (localStorage.getItem("codex_theme") as ThemeId) || "midnight";
    const savedMode = (localStorage.getItem("codex_color_mode") as ColorMode) || "dark";
    set({ themeId: savedTheme, colorMode: savedMode });
    applyTheme(savedTheme, savedMode);
  },
}));

function applyTheme(id: ThemeId, colorMode: ColorMode) {
  const theme = THEMES.find((t) => t.id === id) || THEMES[0]!;
  const root = document.documentElement;
  const vars = colorMode === "light" ? lightVars(theme) : darkVars(theme);

  root.style.setProperty("--color-primary", vars.primary);
  root.style.setProperty("--color-surface", vars.surface);
  root.style.setProperty("--color-accent", theme.accent);
  root.style.setProperty("--color-accent-alt", theme.accentAlt);
  root.style.setProperty("--color-accent-text", vars.accentText);
  root.style.setProperty("--color-on-surface", vars.onSurface);
  root.style.setProperty("--color-text-muted", vars.textMuted);
  root.style.setProperty("--color-bg-gradient", vars.bgGradient);
  root.style.setProperty("--color-surface-gradient", vars.surfaceGradient);
  root.style.setProperty("--color-accent-gradient", theme.accentGradient);
  root.style.setProperty("--color-border", vars.border);
  root.style.setProperty("--color-text-glow", vars.textGlow);
  root.style.setProperty("--color-header-bg", vars.headerBg);
  root.style.setProperty("--color-input-bg", vars.inputBg);
  root.dataset.theme = id;
  root.dataset.colorMode = colorMode;
}

function darkVars(theme: Theme) {
  return {
    primary: theme.primary,
    surface: theme.surface,
    onSurface: "#e2e8f0",
    textMuted: "#cbd5e1",
    accentText: theme.accent,
    bgGradient: theme.bgGradient,
    surfaceGradient: theme.surfaceGradient,
    border: theme.border,
    textGlow: theme.textGlow,
    headerBg: `linear-gradient(180deg, ${theme.primary}ee, ${theme.primary}cc)`,
    inputBg: "rgba(0, 0, 0, 0.28)",
  };
}

function lightVars(theme: Theme) {
  const tint = theme.accent;
  return {
    primary: "#f8fafc",
    surface: "#ffffff",
    onSurface: "#0f172a",
    textMuted: "#475569",
    accentText: `color-mix(in srgb, ${tint} 52%, #0f172a)`,
    bgGradient: `linear-gradient(165deg, #f8fafc 0%, color-mix(in srgb, ${tint} 6%, #f1f5f9) 45%, #e2e8f0 100%)`,
    surfaceGradient:
      "linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95))",
    border: `color-mix(in srgb, ${tint} 28%, #cbd5e1)`,
    textGlow: `0 0 12px color-mix(in srgb, ${tint} 35%, transparent)`,
    headerBg: "linear-gradient(180deg, #ffffffee, #f8fafccc)",
    inputBg: "rgba(255, 255, 255, 0.92)",
  };
}