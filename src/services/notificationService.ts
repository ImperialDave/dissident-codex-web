import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import type { AppNotification } from "@/models";

function notifsRef(uid: string) {
  return collection(getFirebaseDb(), COLLECTIONS.USERS, uid, "notifications");
}

export async function getNotifications(max = 50): Promise<AppNotification[]> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return [];
  const snap = await getDocs(
    query(notifsRef(uid), orderBy("createdAt", "desc"), limit(max))
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, "id">) }));
}

export function listenNotifications(
  onUpdate: (notifications: AppNotification[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return null;
  return onSnapshot(
    query(notifsRef(uid), orderBy("createdAt", "desc"), limit(50)),
    (snap) => {
      onUpdate(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, "id">) })));
    },
    (err) => onError?.(err)
  );
}

export async function markNotificationRead(id: string): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return;
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.USERS, uid, "notifications", id), {
    read: true,
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  const notifs = await getNotifications();
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return;
  await Promise.all(
    notifs.filter((n) => !n.read).map((n) => markNotificationRead(n.id))
  );
}