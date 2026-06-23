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
    const savedRaw = localStorage.getItem("codex_theme") as ThemeId;
    const savedTheme = THEMES.some((t) => t.id === savedRaw) ? savedRaw : "midnight";
    const savedMode = (localStorage.getItem("codex_color_mode") as ColorMode) || "dark";
    set({ themeId: savedTheme, colorMode: savedMode });
    applyTheme(savedTheme, savedMode);
  },
}));

function applyTheme(id: ThemeId, colorMode: ColorMode) {
  const theme = THEMES.find((t) => t.id === id) || THEMES[0]!;
  const root = document.documentElement;
  const vars = colorMode === "light" ? lightVars(theme) : darkVars(theme, theme.family === "calm");

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

function darkVars(theme: Theme, calm: boolean) {
  return {
    primary: theme.primary,
    surface: theme.surface,
    onSurface: calm ? "#e8eaed" : "#e2e8f0",
    textMuted: calm ? "#b8bcc4" : "#cbd5e1",
    accentText: theme.accent,
    bgGradient: theme.bgGradient,
    surfaceGradient: theme.surfaceGradient,
    border: theme.border,
    textGlow: calm ? "none" : theme.textGlow,
    headerBg: calm
      ? `linear-gradient(180deg, ${theme.surface}f5, ${theme.primary}ee)`
      : `linear-gradient(180deg, ${theme.primary}ee, ${theme.primary}cc)`,
    inputBg: calm ? "rgba(0, 0, 0, 0.18)" : "rgba(0, 0, 0, 0.28)",
  };
}

function lightVars(theme: Theme) {
  const tint = theme.accent;
  const calm = theme.family === "calm";
  return {
    primary: calm ? "#f6f4f1" : "#f8fafc",
    surface: "#ffffff",
    onSurface: calm ? "#2c2926" : "#0f172a",
    textMuted: calm ? "#6b6560" : "#475569",
    accentText: calm
      ? `color-mix(in srgb, ${tint} 65%, #2c2926)`
      : `color-mix(in srgb, ${tint} 52%, #0f172a)`,
    bgGradient: calm
      ? `linear-gradient(180deg, #f6f4f1 0%, color-mix(in srgb, ${tint} 5%, #f0eeea) 50%, #ebe8e4 100%)`
      : `linear-gradient(165deg, #f8fafc 0%, color-mix(in srgb, ${tint} 6%, #f1f5f9) 45%, #e2e8f0 100%)`,
    surfaceGradient: calm
      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 246, 243, 0.96))"
      : "linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95))",
    border: calm
      ? `color-mix(in srgb, ${tint} 18%, #d6d0c8)`
      : `color-mix(in srgb, ${tint} 28%, #cbd5e1)`,
    textGlow: calm ? "none" : `0 0 12px color-mix(in srgb, ${tint} 35%, transparent)`,
    headerBg: calm
      ? "linear-gradient(180deg, #fffffffa, #f6f4f1ee)"
      : "linear-gradient(180deg, #ffffffee, #f8fafccc)",
    inputBg: calm ? "rgba(255, 255, 255, 0.96)" : "rgba(255, 255, 255, 0.92)",
  };
}