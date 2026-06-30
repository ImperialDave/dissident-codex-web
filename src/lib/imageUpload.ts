export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_MB = MAX_IMAGE_BYTES / (1024 * 1024);
export const MAX_IMAGE_DIMENSION = 2048;
export const JPEG_QUALITY = 0.85;

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "heic",
  "heif",
  "bmp",
]);

const VIDEO_EXTENSIONS = new Set(["mov", "mp4", "webm", "m4v", "mkv"]);

/** iOS Safari often leaves file.type empty for camera-roll photos (HEIC). */
export function resolveImageContentType(file: Pick<File, "type" | "name">): string | null {
  if (file.type?.startsWith("image/")) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  if (ext === "heic" || ext === "heif") return "image/heic";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (IMAGE_EXTENSIONS.has(ext)) return "image/jpeg";
  return null;
}

export function resolveVideoContentType(file: Pick<File, "type" | "name">): string | null {
  if (file.type?.startsWith("video/")) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  if (ext === "mov") return "video/quicktime";
  if (VIDEO_EXTENSIONS.has(ext)) return "video/mp4";
  return null;
}

export function isImageFile(file: File): boolean {
  return resolveImageContentType(file) !== null;
}

export function isVideoFile(file: File): boolean {
  return resolveVideoContentType(file) !== null;
}

function isHeicLike(contentType: string, fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return (
    contentType === "image/heic" ||
    contentType === "image/heif" ||
    ext === "heic" ||
    ext === "heif"
  );
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import("heic2any");
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: JPEG_QUALITY });
  const blob = Array.isArray(result) ? result[0] : result;
  if (!(blob instanceof Blob)) {
    throw new Error("Could not convert iPhone photo format");
  }
  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

async function rasterizeToJpeg(
  file: File,
  maxDimension = MAX_IMAGE_DIMENSION
): Promise<File> {
  const img = await loadImageElement(file);
  let { width, height } = img;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");
  ctx.drawImage(img, 0, 0, width, height);

  let quality = JPEG_QUALITY;
  let blob = await canvasToJpegBlob(canvas, quality);
  while (blob && blob.size > MAX_IMAGE_BYTES && quality > 0.45) {
    quality -= 0.1;
    blob = await canvasToJpegBlob(canvas, quality);
  }
  if (!blob) throw new Error("Could not compress image");
  if (blob.size > MAX_IMAGE_BYTES) {
    throw new Error("Photo too large even after compression — try a smaller image");
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

/** Normalize iPhone HEIC/large photos to JPEG under Storage limits. */
export async function prepareImageForUpload(file: File): Promise<File> {
  const contentType = resolveImageContentType(file);
  if (!contentType) {
    throw new Error(
      "Only images are allowed. On iPhone, try a JPEG/PNG or post without a photo."
    );
  }

  if (contentType === "image/gif") {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`Image must be under ${MAX_IMAGE_MB}MB`);
    }
    return file;
  }

  let working = file;
  if (isHeicLike(contentType, file.name)) {
    working = await convertHeicToJpeg(file);
  } else if (contentType !== "image/jpeg" || file.size > MAX_IMAGE_BYTES) {
    working = await rasterizeToJpeg(file);
  } else if (file.size > MAX_IMAGE_BYTES) {
    working = await rasterizeToJpeg(file);
  }

  if (working.size > MAX_IMAGE_BYTES) {
    working = await rasterizeToJpeg(working);
  }

  return working;
}

export function mapStorageUploadError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("unauthorized") || message.includes("permission")) {
    return "Upload blocked — open in Safari (not Discord/Instagram), sign in again, or try a smaller photo.";
  }
  if (message.includes("invalid") || message.includes("contentType")) {
    return "Upload blocked — try a JPEG/PNG photo or open the site in Safari.";
  }
  return message;
}
