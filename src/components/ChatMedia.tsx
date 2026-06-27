"use client";

import { useState } from "react";
import { containsGifUrl } from "@/lib/utils";
import { MediaLightbox } from "@/components/MediaLightbox";

interface ChatMediaProps {
  url?: string | null;
  mediaType?: string | null;
  alt?: string;
  className?: string;
  enlargeable?: boolean;
}

export function ChatMedia({
  url,
  mediaType,
  alt = "Chat media",
  className = "",
  enlargeable = false,
}: ChatMediaProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!url?.trim()) return null;

  const isVideo = mediaType?.toLowerCase() === "video";
  const isGif =
    mediaType?.toLowerCase() === "gif" || containsGifUrl(url);

  if (isVideo) {
    return (
      <div
        className={`overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}
      >
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          className="max-h-64 w-full object-contain"
        />
      </div>
    );
  }

  const img = (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={`w-full ${
        isGif ? "max-h-64 object-contain" : "max-h-64 object-cover"
      } ${enlargeable ? "cursor-zoom-in" : ""}`}
    />
  );

  return (
    <>
      <div
        className={`overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}
      >
        {enlargeable ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="block w-full text-left"
            aria-label="View full size"
          >
            {img}
          </button>
        ) : (
          img
        )}
      </div>
      {lightboxOpen && (
        <MediaLightbox url={url} alt={alt} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}
