"use client";

import clsx from "clsx";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";

type Variant = "compact" | "segmented";

export function ColorModeToggle({ variant = "segmented" }: { variant?: Variant }) {
  const { colorMode, setColorMode } = useThemeStore();

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={() => setColorMode(colorMode === "dark" ? "light" : "dark")}
        className="codex-btn-icon"
        aria-label={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={colorMode === "dark" ? "Light mode" : "Dark mode"}
      >
        {colorMode === "dark" ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </button>
    );
  }

  return (
    <div className="codex-segmented flex rounded-full p-1">
      {(
        [
          { id: "dark" as const, label: "Dark", Icon: Moon },
          { id: "light" as const, label: "Light", Icon: Sun },
        ] as const
      ).map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setColorMode(item.id)}
          className={clsx(
            "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition",
            colorMode === item.id
              ? "codex-chip-active"
              : "codex-text-muted hover:text-[var(--color-on-surface)]"
          )}
        >
          <item.Icon className="h-4 w-4" />
          {item.label}
        </button>
      ))}
    </div>
  );
}