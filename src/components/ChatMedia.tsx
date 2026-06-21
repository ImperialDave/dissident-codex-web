import { containsGifUrl } from "@/lib/utils";

interface ChatMediaProps {
  url?: string | null;
  mediaType?: string | null;
  alt?: string;
  className?: string;
}

export function ChatMedia({
  url,
  mediaType,
  alt = "Chat media",
  className = "",
}: ChatMediaProps) {
  if (!url?.trim()) return null;

  const isVideo = mediaType?.toLowerCase() === "video";
  const isGif =
    mediaType?.toLowerCase() === "gif" || containsGifUrl(url);

  if (isVideo) {
    return (
      <div
        className={`overflow-hidden rounded-lg border border-white/10 bg-black/30 ${className}`}
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

  return (
    <div
      className={`overflow-hidden rounded-lg border border-white/10 bg-black/30 ${className}`}
    >
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className={`w-full ${
          isGif ? "max-h-64 object-contain" : "max-h-64 object-cover"
        }`}
      />
    </div>
  );
}
