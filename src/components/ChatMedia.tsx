"use client";

import { useState } from "react";
import { isGifMedia } from "@/lib/gifMedia";
import { MediaLightbox } from "@/components/MediaLightbox";
import { PausableGif } from "@/components/PausableGif";

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
  const isGif = isGifMedia(mediaType, url);

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

  const imageClassName = `w-full ${
    isGif ? "max-h-64 object-contain" : "max-h-64 object-cover"
  } ${enlargeable ? "cursor-zoom-in" : ""}`;

  const media = isGif ? (
    <PausableGif
      src={url}
      alt={alt}
      imageClassName={imageClassName}
      onImageClick={enlargeable ? () => setLightboxOpen(true) : undefined}
    />
  ) : enlargeable ? (
    <button
      type="button"
      onClick={() => setLightboxOpen(true)}
      className="block w-full text-left"
      aria-label="View full size"
    >
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className={imageClassName}
      />
    </button>
  ) : (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={imageClassName}
    />
  );

  return (
    <>
      <div
        className={`overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}
      >
        {media}
      </div>
      {lightboxOpen && (
        <MediaLightbox
          url={url}
          alt={alt}
          mediaType={mediaType}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
