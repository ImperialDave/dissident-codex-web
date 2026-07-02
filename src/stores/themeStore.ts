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
  root.style.setProperty("--color-surface-shadow", vars.surfaceShadow);
  root.style.setProperty("--color-ambient-glow", vars.ambientGlow);
  root.style.setProperty("--color-ambient-glow-alt", vars.ambientGlowAlt);
  root.dataset.theme = id;
  root.dataset.colorMode = colorMode;
}

function darkVars(theme: Theme) {
  const calm = theme.family === "calm";
  return {
    primary: theme.primary,
    surface: theme.surface,
    onSurface: calm ? "#e8eaed" : "#e2e8f0",
    textMuted: calm ? "#b8bcc4" : "#cbd5e1",
    accentText: theme.accent,
    bgGradient: theme.bgGradient,
    surfaceGradient: theme.surfaceGradient,
    border: theme.border,
    textGlow: theme.textGlow,
    headerBg: calm
      ? `linear-gradient(180deg, color-mix(in srgb, ${theme.surface} 96%, transparent), color-mix(in srgb, ${theme.primary} 94%, transparent))`
      : `linear-gradient(180deg, color-mix(in srgb, ${theme.primary} 93%, transparent), color-mix(in srgb, ${theme.primary} 80%, transparent))`,
    inputBg: calm ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.3)",
    surfaceShadow: theme.surfaceShadow,
    ambientGlow: theme.ambientGlow,
    ambientGlowAlt: theme.ambientGlowAlt,
  };
}

function lightVars(theme: Theme) {
  const light = theme.light;
  return {
    primary: light.primary,
    surface: light.surface,
    onSurface: light.onSurface,
    textMuted: light.textMuted,
    accentText: light.accentText,
    bgGradient: light.bgGradient,
    surfaceGradient: light.surfaceGradient,
    border: light.border,
    textGlow: light.textGlow,
    headerBg: light.headerBg,
    inputBg: light.inputBg,
    surfaceShadow: light.surfaceShadow,
    ambientGlow: light.ambientGlow,
    ambientGlowAlt: light.ambientGlowAlt,
  };
}