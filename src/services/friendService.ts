import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import type { Friend, FriendRequest } from "@/models";
import { fetchUser } from "./authService";

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

  const status = await getFriendshipStatus(toUid);
  if (status === "friends") throw new Error("Already friends");
  if (status === "pending_out") throw new Error("Request already sent");

  const me = await fetchUser(uid);
  const ref = doc(collection(getFirebaseDb(), COLLECTIONS.FRIEND_REQUESTS));
  const request: FriendRequest = {
    id: ref.id,
    fromUid: uid,
    fromName: me?.displayName || "User",
    fromPhotoUrl: me?.photoUrl,
    toUid,
    status: "pending",
    createdAt: Timestamp.now(),
  };
  await setDoc(ref, request);
}

export async function respondToFriendRequest(requestId: string, accept: boolean): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");

  const reqRef = doc(getFirebaseDb(), COLLECTIONS.FRIEND_REQUESTS, requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error("Request not found");
  const req = { id: reqSnap.id, ...reqSnap.data() } as FriendRequest;
  if (req.toUid !== uid) throw new Error("Not your request");

  if (!accept) {
    await deleteDoc(reqRef);
    return;
  }

  const batch = writeBatch(getFirebaseDb());
  const now = Timestamp.now();
  batch.set(doc(getFirebaseDb(), COLLECTIONS.USERS, uid, "friends", req.fromUid), {
    uid: req.fromUid,
    displayName: req.fromName,
    photoUrl: req.fromPhotoUrl,
    since: now,
  });
  batch.set(doc(getFirebaseDb(), COLLECTIONS.USERS, req.fromUid, "friends", uid), {
    uid,
    displayName: (await fetchUser(uid))?.displayName || "User",
    photoUrl: (await fetchUser(uid))?.photoUrl,
    since: now,
  });
  batch.delete(reqRef);
  await batch.commit();
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
