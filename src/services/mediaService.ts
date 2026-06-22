import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";
import { getFirebaseAuth } from "@/lib/firebase";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_DURATION_SEC = 120;

export type MediaFolder =
  | "post_images"
  | "profile_pics"
  | "profile_backgrounds"
  | "comment_images"
  | "images"
  | "chat_media";

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

/** iOS Safari often leaves file.type empty for camera-roll photos (HEIC). */
function resolveImageContentType(file: File): string | null {
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

function isImageFile(file: File): boolean {
  return resolveImageContentType(file) !== null;
}

export async function uploadImage(
  file: File,
  folder: MediaFolder
): Promise<string> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  const contentType = resolveImageContentType(file);
  if (!contentType) {
    throw new Error(
      "Only images are allowed. On iPhone, try a JPEG/PNG or post without a photo."
    );
  }
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image must be under 10MB");

  const storage = getFirebaseStorage();
  const path = `${folder}/${uid}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType });
  return getDownloadURL(storageRef);
}

export async function uploadChatImage(file: File): Promise<string> {
  return uploadImage(file, "chat_media");
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video metadata"));
    };
    video.src = url;
  });
}

export async function uploadChatVideo(file: File): Promise<string> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  if (!file.type.startsWith("video/")) throw new Error("Only videos are allowed");
  if (file.size > MAX_VIDEO_BYTES) throw new Error("Video must be under 50MB");

  const duration = await readVideoDuration(file);
  if (!Number.isFinite(duration) || duration > MAX_VIDEO_DURATION_SEC) {
    throw new Error("Video must be 2 minutes or shorter");
  }

  const storage = getFirebaseStorage();
  const path = `chat_media/${uid}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export { isImageFile, resolveImageContentType };
