"use client";

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { ensureMicrophoneForVoice } from "@/lib/microphonePermission";
import { useVoiceUiStore } from "@/stores/voiceUiStore";

export function MicrophonePermissionDialog() {
  const open = useVoiceUiStore((s) => s.showMicDeniedDialog);
  const setShowMicDeniedDialog = useVoiceUiStore((s) => s.setShowMicDeniedDialog);
  const [retrying, setRetrying] = useState(false);

  const handleTryAgain = useCallback(async () => {
    setRetrying(true);
    try {
      const result = await ensureMicrophoneForVoice();
      if (result.status === "granted") {
        setShowMicDeniedDialog(false);
      }
    } finally {
      setRetrying(false);
    }
  }, [setShowMicDeniedDialog]);

  const handleDismiss = useCallback(() => {
    setShowMicDeniedDialog(false);
  }, [setShowMicDeniedDialog]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="codex-modal-overlay z-[100]">
      <div
        role="dialog"
        aria-labelledby="mic-permission-title"
        className="codex-modal max-w-md"
      >
        <div className="codex-modal-body">
        <h2 id="mic-permission-title" className="text-lg font-semibold text-white">
          Microphone access needed
        </h2>
        <p className="mt-3 text-sm text-slate-300">
          Voice calls need your microphone. Allow microphone access for this site in your browser
          settings, then try again.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-slate-400">
          <li>Chrome / Edge: click the lock icon in the address bar → Site settings → Microphone → Allow</li>
          <li>Safari: Settings → Websites → Microphone → Allow for this site</li>
          <li>Firefox: click the permissions icon in the address bar → Allow microphone</li>
        </ul>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="codex-btn-secondary rounded-full px-4 py-2 text-sm"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => void handleTryAgain()}
            disabled={retrying}
            className="codex-btn-accent rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {retrying ? "Checking..." : "Try again"}
          </button>
        </div>
        </div>
      </div>
    </div>,
    document.body
  );
}