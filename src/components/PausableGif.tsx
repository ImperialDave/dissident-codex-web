"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useGifPlaybackStore } from "@/stores/gifPlaybackStore";

interface PausableGifProps {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  loading?: "lazy" | "eager";
  onImageClick?: () => void;
  imageClickLabel?: string;
}

function loadImage(url: string, crossOrigin?: "anonymous"): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
}

function frameFromImage(img: HTMLImageElement): string | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx || !canvas.width || !canvas.height) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

async function captureGifFrame(url: string, liveImg?: HTMLImageElement | null): Promise<string | null> {
  if (liveImg?.complete && liveImg.naturalWidth > 0) {
    const frame = frameFromImage(liveImg);
    if (frame) return frame;
  }

  try {
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!response.ok) throw new Error("fetch failed");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await loadImage(objectUrl);
      return frameFromImage(img);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    // fall through
  }

  try {
    const img = await loadImage(url, "anonymous");
    return frameFromImage(img);
  } catch {
    return null;
  }
}

export function PausableGif({
  src,
  alt,
  className = "",
  imageClassName = "",
  loading = "lazy",
  onImageClick,
  imageClickLabel = "View full size",
}: PausableGifProps) {
  const controlId = useId();
  const imgRef = useRef<HTMLImageElement>(null);
  const freezeGenRef = useRef(0);
  const autoplayGifs = useGifPlaybackStore((s) => s.autoplayGifs);
  const [playing, setPlaying] = useState(autoplayGifs);
  const [frozenSrc, setFrozenSrc] = useState<string | null>(null);
  const [freezing, setFreezing] = useState(false);

  useEffect(() => {
    setPlaying(autoplayGifs);
    setFrozenSrc(null);
  }, [autoplayGifs]);

  useEffect(() => {
    setFrozenSrc(null);
  }, [src]);

  const freeze = useCallback(async () => {
    const gen = ++freezeGenRef.current;
    setFreezing(true);
    try {
      const frame = await captureGifFrame(src, imgRef.current);
      if (gen !== freezeGenRef.current) return;
      if (frame) setFrozenSrc(frame);
    } finally {
      if (gen === freezeGenRef.current) setFreezing(false);
    }
  }, [src]);

  useEffect(() => {
    if (playing) return;
    if (frozenSrc) return;
    void freeze();
  }, [playing, frozenSrc, freeze]);

  const togglePlayback = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (playing) {
        void freeze().then(() => setPlaying(false));
      } else {
        setPlaying(true);
      }
    },
    [playing, freeze]
  );

  const displaySrc = playing ? src : frozenSrc ?? src;

  const image = (
    <img
      ref={imgRef}
      src={displaySrc}
      alt={alt}
      loading={loading}
      className={imageClassName}
    />
  );

  return (
    <div className={`relative ${className}`}>
      {onImageClick ? (
        <button
          type="button"
          onClick={onImageClick}
          className="block w-full text-left"
          aria-label={imageClickLabel}
        >
          {image}
        </button>
      ) : (
        image
      )}
      <button
        type="button"
        id={controlId}
        onClick={togglePlayback}
        disabled={freezing}
        className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-md backdrop-blur-sm transition hover:bg-black/80 disabled:opacity-50"
        aria-label={playing ? "Pause GIF" : "Play GIF"}
        aria-pressed={playing}
        title={playing ? "Pause GIF" : "Play GIF"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
    </div>
  );
}
