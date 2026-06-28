import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS, MAX_FOLLOWING } from "@/lib/constants";
import { mapFirestoreError, stripUndefinedFields } from "@/lib/utils";
import type { UserFollow } from "@/models";
import { fetchUser } from "./authService";
import { isBlockedEitherWay } from "./blockService";

let followingCache: Set<string> | null = null;

function followingRef(myUid: string, theirUid: string) {
  return doc(getFirebaseDb(), COLLECTIONS.USERS, myUid, "following", theirUid);
}

export function clearFollowingCache(): void {
  followingCache = null;
}

export async function isFollowing(otherUid: string): Promise<boolean> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid || uid === otherUid) return false;
  const snap = await getDoc(followingRef(uid, otherUid));
  return snap.exists();
}

export async function getFollowing(targetUid?: string): Promise<UserFollow[]> {
  const uid = targetUid || getFirebaseAuth().currentUser?.uid;
  if (!uid) return [];
  const snap = await getDocs(collection(getFirebaseDb(), COLLECTIONS.USERS, uid, "following"));
  return snap.docs
    .map((d) => ({ uid: d.id, ...(d.data() as Omit<UserFollow, "uid">) }))
    .sort((a, b) => (b.followedAt?.seconds ?? 0) - (a.followedAt?.seconds ?? 0));
}

export async function getFollowingIds(): Promise<Set<string>> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return new Set();
  if (followingCache) return followingCache;

  try {
    const snap = await getDocs(collection(getFirebaseDb(), COLLECTIONS.USERS, uid, "following"));
    followingCache = new Set(snap.docs.map((d) => d.id));
    return followingCache;
  } catch {
    return new Set();
  }
}

export async function followUser(otherUid: string): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  if (uid === otherUid) throw new Error("Cannot follow yourself");
  if (await isBlockedEitherWay(otherUid)) {
    throw new Error("Cannot follow this user");
  }
  if (await isFollowing(otherUid)) throw new Error("Already following");

  const existing = await getFollowingIds();
  if (existing.size >= MAX_FOLLOWING) {
    throw new Error(`Follow limit reached (max ${MAX_FOLLOWING})`);
  }

  const other = await fetchUser(otherUid);
  if (!other) throw new Error("User not found");

  const payload: UserFollow = {
    uid: otherUid,
    displayName: other.displayName || "User",
    ...(other.photoUrl ? { photoUrl: other.photoUrl } : {}),
    followedAt: Timestamp.now(),
  };

  try {
    await setDoc(
      followingRef(uid, otherUid),
      stripUndefinedFields(payload as unknown as Record<string, unknown>)
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to follow user";
    throw new Error(mapFirestoreError(message));
  }

  followingCache = new Set(existing);
  followingCache.add(otherUid);
}

export async function unfollowUser(otherUid: string): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  if (!(await isFollowing(otherUid))) throw new Error("Not following this user");

  try {
    await deleteDoc(followingRef(uid, otherUid));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to unfollow user";
    throw new Error(mapFirestoreError(message));
  }

  if (followingCache) followingCache.delete(otherUid);
}

export async function toggleFollow(otherUid: string): Promise<boolean> {
  if (await isFollowing(otherUid)) {
    await unfollowUser(otherUid);
    return false;
  }
  await followUser(otherUid);
  return true;
}