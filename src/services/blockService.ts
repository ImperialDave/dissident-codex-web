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
import { fetchUser } from "./authService";

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

export async function isBlockedEitherWay(otherUid: string): Promise<boolean> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid || uid === otherUid) return false;

  const db = getFirebaseDb();
  try {
    const [mine, theirs] = await Promise.all([
      getDoc(doc(db, COLLECTIONS.USERS, uid, "blockedUsers", otherUid)),
      getDoc(doc(db, COLLECTIONS.USERS, otherUid, "blockedUsers", uid)),
    ]);
    return mine.exists() || theirs.exists();
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

  await batch.commit();
  await clearFriendRequestsBetween(uid, otherUid);
  blockedCache = null;
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
  if (blockedIds.size === 0) return items;
  return items.filter((item) => !blockedIds.has(item.authorId));
}
