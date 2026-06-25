"use client";

import { useEffect } from "react";
import { IncomingCallOverlay } from "@/components/IncomingCallOverlay";
import { MicrophonePermissionDialog } from "@/components/MicrophonePermissionDialog";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";

export function Providers({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore((s) => s.init);
  const initTheme = useThemeStore((s) => s.init);

  useEffect(() => {
    initTheme();
    return initAuth();
  }, [initAuth, initTheme]);

  return (
    <>
      {children}
      <IncomingCallOverlay />
      <MicrophonePermissionDialog />
    </>
  );
}