"use client";

import { useState } from "react";
import { containsGifUrl } from "@/lib/utils";
import { MediaLightbox } from "@/components/MediaLightbox";

interface PostMediaProps {
  url?: string | null;
  mediaType?: string | null;
  alt?: string;
  className?: string;
  preview?: boolean;
  enlargeable?: boolean;
}

export function PostMedia({
  url,
  mediaType,
  alt = "Post media",
  className = "",
  preview = false,
  enlargeable = false,
}: PostMediaProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!url?.trim()) return null;

  const isGif =
    mediaType?.toLowerCase() === "gif" || containsGifUrl(url);

  const img = (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={`w-full ${
        preview
          ? isGif
            ? "max-h-56 object-contain"
            : "max-h-56 object-cover"
          : isGif
            ? "max-h-[28rem] object-contain"
            : "max-h-96 object-cover"
      } ${enlargeable ? "cursor-zoom-in" : ""}`}
    />
  );

  return (
    <>
      <div
        className={`overflow-hidden rounded-lg border border-white/10 bg-black/30 ${
          preview ? "mt-3" : "mt-4"
        } ${className}`}
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
