import { containsGifUrl } from "@/lib/utils";

interface PostMediaProps {
  url?: string | null;
  mediaType?: string | null;
  alt?: string;
  className?: string;
  preview?: boolean;
}

export function PostMedia({
  url,
  mediaType,
  alt = "Post media",
  className = "",
  preview = false,
}: PostMediaProps) {
  if (!url?.trim()) return null;

  const isGif =
    mediaType?.toLowerCase() === "gif" || containsGifUrl(url);

  return (
    <div
      className={`overflow-hidden rounded-lg border border-white/10 bg-black/30 ${
        preview ? "mt-3" : "mt-4"
      } ${className}`}
    >
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
        }`}
      />
    </div>
  );
}