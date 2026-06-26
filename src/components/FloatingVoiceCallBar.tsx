"use client";

import { createPortal } from "react-dom";
import { VoiceCallBar, type VoiceCallBarProps } from "@/components/VoiceCallBar";

type FloatingVoiceCallBarProps = Omit<VoiceCallBarProps, "variant">;

export function FloatingVoiceCallBar(props: FloatingVoiceCallBarProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <VoiceCallBar {...props} variant="floating" />,
    document.body
  );
}
