"use client";

import clsx from "clsx";
import { useThemeStore } from "@/stores/themeStore";

type Variant = "compact" | "segmented";

export function ColorModeToggle({ variant = "segmented" }: { variant?: Variant }) {
  const { colorMode, setColorMode } = useThemeStore();

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={() => setColorMode(colorMode === "dark" ? "light" : "dark")}
        className="codex-btn-ghost rounded-lg px-2.5 py-1.5 text-base"
        aria-label={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={colorMode === "dark" ? "Light mode" : "Dark mode"}
      >
        {colorMode === "dark" ? "☀️" : "🌙"}
      </button>
    );
  }

  return (
    <div className="codex-segmented flex rounded-lg p-1">
      {(
        [
          { id: "dark" as const, label: "Dark", icon: "🌙" },
          { id: "light" as const, label: "Light", icon: "☀️" },
        ] as const
      ).map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setColorMode(item.id)}
          className={clsx(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition",
            colorMode === item.id ? "codex-chip-active" : "codex-text-muted hover:text-[var(--color-on-surface)]"
          )}
        >
          <span>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}