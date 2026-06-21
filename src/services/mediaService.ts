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

export async function uploadImage(
  file: File,
  folder: MediaFolder
): Promise<string> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  if (!file.type.startsWith("image/")) throw new Error("Only images are allowed");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image must be under 10MB");

  const storage = getFirebaseStorage();
  const path = `${folder}/${uid}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
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
