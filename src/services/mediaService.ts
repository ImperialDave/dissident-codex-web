import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";
import { getFirebaseAuth } from "@/lib/firebase";

export async function uploadImage(
  file: File,
  folder: "post_images" | "profile_pics" | "profile_backgrounds" | "comment_images" | "images"
): Promise<string> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  if (!file.type.startsWith("image/")) throw new Error("Only images are allowed");
  if (file.size > 10 * 1024 * 1024) throw new Error("Image must be under 10MB");

  const storage = getFirebaseStorage();
  const path = `${folder}/${uid}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}