import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS, MAX_BIO, MAX_FLAIR, MAX_NAME } from "@/lib/constants";

export async function updateProfile(updates: {
  displayName?: string;
  bio?: string;
  photoUrl?: string;
  backgroundUrl?: string;
  flair?: string;
}): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");

  const payload: Record<string, string> = {};
  if (updates.displayName !== undefined) {
    const name = updates.displayName.trim();
    if (name.length > MAX_NAME) throw new Error(`Display name too long (max ${MAX_NAME})`);
    if (name) payload.displayName = name;
  }
  if (updates.bio !== undefined) payload.bio = updates.bio.trim().slice(0, MAX_BIO);
  if (updates.photoUrl !== undefined) payload.photoUrl = updates.photoUrl;
  if (updates.backgroundUrl !== undefined) payload.backgroundUrl = updates.backgroundUrl;
  if (updates.flair !== undefined) payload.flair = updates.flair.trim().slice(0, MAX_FLAIR);

  if (Object.keys(payload).length === 0) return;
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.USERS, uid), payload);
}
