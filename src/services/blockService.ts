import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import type { BlockStatus, BlockedUser } from "@/models";
import { fetchUser } from "./authService";
import { clearFollowingCache } from "./followService";

let blockedCache: Set<string> | null = null;

export async function getBlockedUserIds(): Promise<Set<string>> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return new Set();
  if (blockedCache) return blockedCache;

  try {
    const snap = await getDocs(
      collection(getFirebaseDb(), COLLECTIONS.USERS, uid, "blockedUsers")
    );
    blockedCache = new Set(snap.docs.map((d) => d.id));
    return blockedCache;
  } catch {
    // Rules may lag deploy — treat as no blocks so feed still loads.
    return new Set();
  }
}

export function clearBlockedCache(): void {
  blockedCache = null;
}

export async function isBlocked(otherUid: string): Promise<boolean> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid || uid === otherUid) return false;
  try {
    const snap = await getDoc(
      doc(getFirebaseDb(), COLLECTIONS.USERS, uid, "blockedUsers", otherUid)
    );
    return snap.exists();
  } catch {
    return false;
  }
}

export async function getBlockStatus(otherUid: string): Promise<BlockStatus> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid || uid === otherUid) return "none";

  const db = getFirebaseDb();
  try {
    const mine = await getDoc(doc(db, COLLECTIONS.USERS, uid, "blockedUsers", otherUid));
    if (mine.exists()) return "you_blocked";
  } catch {
    return "none";
  }

  try {
    const theirs = await getDoc(doc(db, COLLECTIONS.USERS, otherUid, "blockedUsers", uid));
    if (theirs.exists()) return "they_blocked";
  } catch {
    // Only the block owner can read their list; permission denied is expected here.
  }

  return "none";
}

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return [];

  const snap = await getDocs(
    collection(getFirebaseDb(), COLLECTIONS.USERS, uid, "blockedUsers")
  );
  return snap.docs
    .map((d) => ({ uid: d.id, ...(d.data() as Omit<BlockedUser, "uid">) }))
    .sort((a, b) => (b.blockedAt?.seconds ?? 0) - (a.blockedAt?.seconds ?? 0));
}

export async function isBlockedEitherWay(otherUid: string): Promise<boolean> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid || uid === otherUid) return false;

  const db = getFirebaseDb();
  try {
    const mine = await getDoc(doc(db, COLLECTIONS.USERS, uid, "blockedUsers", otherUid));
    if (mine.exists()) return true;
  } catch {
    return false;
  }

  try {
    const theirs = await getDoc(doc(db, COLLECTIONS.USERS, otherUid, "blockedUsers", uid));
    return theirs.exists();
  } catch {
    return false;
  }
}

async function clearFriendRequestsBetween(uidA: string, uidB: string): Promise<void> {
  const db = getFirebaseDb();
  const pairs = [
    query(
      collection(db, COLLECTIONS.FRIEND_REQUESTS),
      where("fromUid", "==", uidA),
      where("toUid", "==", uidB),
      where("status", "==", "pending")
    ),
    query(
      collection(db, COLLECTIONS.FRIEND_REQUESTS),
      where("fromUid", "==", uidB),
      where("toUid", "==", uidA),
      where("status", "==", "pending")
    ),
  ];
  for (const q of pairs) {
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { status: "declined" })));
  }
}

export async function blockUser(otherUid: string): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  if (uid === otherUid) throw new Error("Cannot block yourself");

  const other = await fetchUser(otherUid);
  const db = getFirebaseDb();
  const batch = writeBatch(db);

  batch.set(doc(db, COLLECTIONS.USERS, uid, "blockedUsers", otherUid), {
    uid: otherUid,
    displayName: other?.displayName || "User",
    blockedAt: Timestamp.now(),
  });
  batch.delete(doc(db, COLLECTIONS.USERS, uid, "friends", otherUid));
  batch.delete(doc(db, COLLECTIONS.USERS, otherUid, "friends", uid));
  batch.delete(doc(db, COLLECTIONS.USERS, uid, "following", otherUid));

  await batch.commit();
  await clearFriendRequestsBetween(uid, otherUid);
  blockedCache = null;
  clearFollowingCache();
}

export async function unblockUser(otherUid: string): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");

  await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.USERS, uid, "blockedUsers", otherUid));
  blockedCache = null;
}

export function excludeBlockedAuthors<T extends { authorId: string }>(
  items: T[],
  blockedIds: Set<string>
): T[] {
  return excludeBlockedUserIds(items, blockedIds, (item) => item.authorId);
}

export function excludeBlockedUserIds<T>(
  items: T[],
  blockedIds: Set<string>,
  getUserId: (item: T) => string
): T[] {
  if (blockedIds.size === 0) return items;
  return items.filter((item) => !blockedIds.has(getUserId(item)));
}
