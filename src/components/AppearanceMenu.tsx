"use client";

import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { Palette, X } from "lucide-react";
import { AppearancePicker } from "@/components/AppearancePicker";

export function AppearanceMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="codex-btn-icon"
        aria-label="Appearance settings"
        aria-expanded={open}
        aria-controls={panelId}
        title="Appearance"
      >
        <Palette className="h-5 w-5" />
      </button>

      <div
        className={clsx("codex-appearance-overlay", open && "codex-appearance-overlay-open")}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />

      <aside
        id={panelId}
        ref={panelRef}
        className={clsx("codex-appearance-panel", open && "codex-appearance-panel-open")}
        aria-hidden={!open}
        role="dialog"
        aria-label="Appearance settings"
      >
        <div className="codex-appearance-panel-head">
          <div>
            <p className="codex-appearance-eyebrow">Settings</p>
            <h2 className="codex-appearance-title">Appearance</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="codex-btn-icon"
            aria-label="Close appearance menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="codex-appearance-panel-body">
          <AppearancePicker />
        </div>
      </aside>
    </>
  );
}