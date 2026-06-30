"use client";

import clsx from "clsx";
import { THEME_FAMILIES, THEMES } from "@/lib/constants";
import { ColorModeToggle } from "@/components/ColorModeToggle";
import { useGifPlaybackStore } from "@/stores/gifPlaybackStore";
import { useThemeStore } from "@/stores/themeStore";

export function AppearancePicker({ compact }: { compact?: boolean }) {
  const { themeId, setTheme } = useThemeStore();
  const { autoplayGifs, setAutoplayGifs } = useGifPlaybackStore();

  return (
    <div className={clsx("space-y-5", compact && "space-y-4")}>
      <div>
        <p className="codex-appearance-label">GIF playback</p>
        <p className="codex-appearance-hint">
          Autoplay animated GIFs in posts, comments, and chats. You can still pause any GIF individually.
        </p>
        <label className="mt-2 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={autoplayGifs}
            onChange={(e) => setAutoplayGifs(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-accent)]"
          />
          <span className="text-sm text-[var(--color-on-surface)]">Autoplay GIFs</span>
        </label>
      </div>

      <div>
        <p className="codex-appearance-label">Brightness</p>
        <p className="codex-appearance-hint">Light or dark interface.</p>
        <div className="mt-2">
          <ColorModeToggle />
        </div>
      </div>

      {THEME_FAMILIES.map((family) => {
        const themes = THEMES.filter((t) => t.family === family.id);
        return (
          <div key={family.id}>
            <p className="codex-appearance-label">{family.label}</p>
            <p className="codex-appearance-hint">{family.hint}</p>
            <div className="codex-appearance-track mt-2" role="list" aria-label={`${family.label} color schemes`}>
              {themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="listitem"
                  onClick={() => setTheme(t.id)}
                  className="codex-appearance-option shrink-0"
                  title={t.label}
                  aria-pressed={themeId === t.id}
                >
                  <span
                    className={clsx(
                      "codex-theme-swatch",
                      themeId === t.id && "codex-theme-swatch-active"
                    )}
                    style={{ background: t.swatch }}
                  />
                  <span
                    className={clsx(
                      "codex-appearance-option-label",
                      themeId === t.id && "codex-appearance-option-label-active"
                    )}
                  >
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
