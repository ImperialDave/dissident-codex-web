import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import { mapFirestoreError, stripUndefinedFields } from "@/lib/utils";
import type { Friend, FriendRequest } from "@/models";
import { fetchUser } from "./authService";
import { isBlockedEitherWay } from "./blockService";

export type FriendshipStatus = "none" | "friends" | "pending_out" | "pending_in";

export async function getFriendshipStatus(otherUid: string): Promise<FriendshipStatus> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid || uid === otherUid) return "none";

  const friendSnap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.USERS, uid, "friends", otherUid));
  if (friendSnap.exists()) return "friends";

  const outSnap = await getDocs(
    query(
      collection(getFirebaseDb(), COLLECTIONS.FRIEND_REQUESTS),
      where("fromUid", "==", uid),
      where("toUid", "==", otherUid),
      where("status", "==", "pending")
    )
  );
  if (!outSnap.empty) return "pending_out";

  const inSnap = await getDocs(
    query(
      collection(getFirebaseDb(), COLLECTIONS.FRIEND_REQUESTS),
      where("fromUid", "==", otherUid),
      where("toUid", "==", uid),
      where("status", "==", "pending")
    )
  );
  if (!inSnap.empty) return "pending_in";
  return "none";
}

export async function sendFriendRequest(toUid: string): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  if (uid === toUid) throw new Error("Cannot friend yourself");
  if (await isBlockedEitherWay(toUid)) throw new Error("Cannot send friend request to this user");

  const status = await getFriendshipStatus(toUid);
  if (status === "friends") throw new Error("Already friends");
  if (status === "pending_out") throw new Error("Request already sent");

  const me = await fetchUser(uid);
  const ref = doc(collection(getFirebaseDb(), COLLECTIONS.FRIEND_REQUESTS));
  const request: FriendRequest = {
    id: ref.id,
    fromUid: uid,
    fromName: me?.displayName || "User",
    ...(me?.photoUrl ? { fromPhotoUrl: me.photoUrl } : {}),
    toUid,
    status: "pending",
    createdAt: Timestamp.now(),
  };
  try {
    await setDoc(ref, stripUndefinedFields(request as unknown as Record<string, unknown>));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send friend request";
    throw new Error(mapFirestoreError(message));
  }
}

export async function respondToFriendRequest(requestId: string, accept: boolean): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");

  const reqRef = doc(getFirebaseDb(), COLLECTIONS.FRIEND_REQUESTS, requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error("Request not found");
  const req = { id: reqSnap.id, ...reqSnap.data() } as FriendRequest;
  if (req.toUid !== uid) throw new Error("Not your request");
  if (req.status !== "pending") throw new Error("Request already handled");

  if (!accept) {
    try {
      await updateDoc(reqRef, { status: "declined" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to decline request";
      throw new Error(mapFirestoreError(message));
    }
    return;
  }

  const me = await fetchUser(uid);
  const batch = writeBatch(getFirebaseDb());
  const now = Timestamp.now();
  batch.set(
    doc(getFirebaseDb(), COLLECTIONS.USERS, uid, "friends", req.fromUid),
    stripUndefinedFields({
      uid: req.fromUid,
      displayName: req.fromName,
      ...(req.fromPhotoUrl ? { photoUrl: req.fromPhotoUrl } : {}),
      since: now,
    })
  );
  batch.set(
    doc(getFirebaseDb(), COLLECTIONS.USERS, req.fromUid, "friends", uid),
    stripUndefinedFields({
      uid,
      displayName: me?.displayName || "User",
      ...(me?.photoUrl ? { photoUrl: me.photoUrl } : {}),
      since: now,
    })
  );
  batch.update(reqRef, { status: "accepted" });
  try {
    await batch.commit();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to accept request";
    throw new Error(mapFirestoreError(message));
  }
}

export async function getIncomingRequestFrom(fromUid: string): Promise<FriendRequest | null> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return null;
  const snap = await getDocs(
    query(
      collection(getFirebaseDb(), COLLECTIONS.FRIEND_REQUESTS),
      where("fromUid", "==", fromUid),
      where("toUid", "==", uid),
      where("status", "==", "pending")
    )
  );
  if (snap.empty) return null;
  const docSnap = snap.docs[0]!;
  return { id: docSnap.id, ...(docSnap.data() as Omit<FriendRequest, "id">) };
}

export async function getIncomingFriendRequests(): Promise<FriendRequest[]> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return [];
  const snap = await getDocs(
    query(
      collection(getFirebaseDb(), COLLECTIONS.FRIEND_REQUESTS),
      where("toUid", "==", uid),
      where("status", "==", "pending")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FriendRequest, "id">) }));
}

export async function getFriends(targetUid?: string): Promise<Friend[]> {
  const uid = targetUid || getFirebaseAuth().currentUser?.uid;
  if (!uid) return [];
  const snap = await getDocs(collection(getFirebaseDb(), COLLECTIONS.USERS, uid, "friends"));
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<Friend, "uid">) }));
}
