import { collection, doc, getDocs, limit, query, updateDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS, MAX_BIO, MAX_FLAIR, MAX_NAME } from "@/lib/constants";
import { withResolvedRole } from "@/lib/utils";
import type { User } from "@/models";

let userDirectoryCache: User[] | null = null;
let userDirectoryCacheAt = 0;
const USER_DIRECTORY_TTL_MS = 60_000;

async function loadUserDirectory(max = 300): Promise<User[]> {
  const now = Date.now();
  if (userDirectoryCache && now - userDirectoryCacheAt < USER_DIRECTORY_TTL_MS) {
    return userDirectoryCache;
  }
  const snap = await getDocs(query(collection(getFirebaseDb(), COLLECTIONS.USERS), limit(max)));
  userDirectoryCache = snap.docs.map((d) =>
    withResolvedRole({ uid: d.id, ...(d.data() as Omit<User, "uid">) })
  );
  userDirectoryCacheAt = now;
  return userDirectoryCache;
}

export async function searchUsers(q: string, max = 30): Promise<User[]> {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];

  const me = getFirebaseAuth().currentUser?.uid;
  const users = await loadUserDirectory(300);
  return users
    .filter((u) => u.uid !== me)
    .filter(
      (u) =>
        u.displayName.toLowerCase().includes(needle) ||
        (u.flair?.toLowerCase().includes(needle) ?? false) ||
        (u.bio?.toLowerCase().includes(needle) ?? false)
    )
    .slice(0, max);
}

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