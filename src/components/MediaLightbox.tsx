"use client";

import { useEffect } from "react";
import { isGifMedia } from "@/lib/gifMedia";
import { PausableGif } from "@/components/PausableGif";

interface MediaLightboxProps {
  url: string;
  alt?: string;
  mediaType?: string | null;
  onClose: () => void;
}

export function MediaLightbox({
  url,
  alt = "Enlarged image",
  mediaType,
  onClose,
}: MediaLightboxProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const isGif = isGifMedia(mediaType, url);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged image"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-lg bg-black/50 px-3 py-1.5 text-sm text-white hover:bg-black/70"
      >
        Close
      </button>
      <div onClick={(e) => e.stopPropagation()}>
        {isGif ? (
          <PausableGif
            src={url}
            alt={alt}
            imageClassName="max-h-[90vh] max-w-full object-contain"
            loading="eager"
          />
        ) : (
          <img
            src={url}
            alt={alt}
            className="max-h-[90vh] max-w-full object-contain"
          />
        )}
      </div>
    </div>
  );
}
