import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage, getFirebaseAuth } from "@/lib/firebase";
import {
  prepareImageForUpload,
  resolveImageContentType,
  resolveVideoContentType,
  isImageFile,
  isVideoFile,
  mapStorageUploadError,
} from "@/lib/imageUpload";

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_DURATION_SEC = 120;

export type MediaFolder =
  | "post_images"
  | "profile_pics"
  | "profile_backgrounds"
  | "comment_images"
  | "comment_media"
  | "images"
  | "chat_media";

export async function uploadImage(
  file: File,
  folder: MediaFolder
): Promise<string> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  try {
    const prepared = await prepareImageForUpload(file);
    const contentType = resolveImageContentType(prepared) || "image/jpeg";
    const storage = getFirebaseStorage();
    const path = `${folder}/${uid}/${Date.now()}_${prepared.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, prepared, { contentType });
    return getDownloadURL(storageRef);
  } catch (err) {
    throw new Error(mapStorageUploadError(err));
  }
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

async function uploadVideo(file: File, folder: string): Promise<string> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  const contentType = resolveVideoContentType(file);
  if (!contentType) throw new Error("Only videos are allowed");
  if (file.size > MAX_VIDEO_BYTES) throw new Error("Video must be under 50MB");

  const duration = await readVideoDuration(file);
  if (!Number.isFinite(duration) || duration > MAX_VIDEO_DURATION_SEC) {
    throw new Error("Video must be 2 minutes or shorter");
  }

  try {
    const storage = getFirebaseStorage();
    const path = `${folder}/${uid}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, { contentType });
    return getDownloadURL(storageRef);
  } catch (err) {
    throw new Error(mapStorageUploadError(err));
  }
}

export async function uploadCommentImage(file: File): Promise<string> {
  return uploadImage(file, "comment_images");
}

export async function uploadCommentVideo(file: File): Promise<string> {
  return uploadVideo(file, "comment_media");
}

export async function uploadChatVideo(file: File): Promise<string> {
  return uploadVideo(file, "chat_media");
}

export { isImageFile, isVideoFile, resolveImageContentType, resolveVideoContentType };