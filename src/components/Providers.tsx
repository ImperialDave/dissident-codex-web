"use client";

import { useEffect } from "react";
import { GlobalVoiceController } from "@/components/GlobalVoiceController";
import { IncomingCallOverlay } from "@/components/IncomingCallOverlay";
import { MicrophonePermissionDialog } from "@/components/MicrophonePermissionDialog";
import { useAuthStore } from "@/stores/authStore";
import { useGifPlaybackStore } from "@/stores/gifPlaybackStore";
import { useThemeStore } from "@/stores/themeStore";

function GlobalVoiceLayer() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  return <GlobalVoiceController />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore((s) => s.init);
  const initTheme = useThemeStore((s) => s.init);
  const initGifPlayback = useGifPlaybackStore((s) => s.init);

  useEffect(() => {
    initTheme();
    initGifPlayback();
    return initAuth();
  }, [initAuth, initGifPlayback, initTheme]);

  return (
    <>
      {children}
      <GlobalVoiceLayer />
      <IncomingCallOverlay />
      <MicrophonePermissionDialog />
    </>
  );
}
