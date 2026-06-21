import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  onSnapshot,
  writeBatch,
  Timestamp,
  increment,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS, MAX_CHAT_MESSAGE } from "@/lib/constants";
import { containsGifUrl, dmRoomId, mapFirestoreError, resolveRole, topicRoomId } from "@/lib/utils";
import {
  CHAT_TYPE_DM,
  CHAT_TYPE_TOPIC,
  canModerate,
  canPost,
  type ChatMessage,
  type ChatRoom,
} from "@/models";
import { fetchUser } from "./authService";

function toRoom(id: string, data: Record<string, unknown>): ChatRoom {
  return {
    id,
    type: (data.type as string) || CHAT_TYPE_TOPIC,
    title: (data.title as string) || "",
    topicId: (data.topicId as string) || null,
    topicName: (data.topicName as string) || null,
    memberIds: (data.memberIds as string[]) || [],
    createdBy: (data.createdBy as string) || "",
    lastMessagePreview: (data.lastMessagePreview as string) || "",
    lastMessageAuthorId: (data.lastMessageAuthorId as string) || "",
    messageCount: Number(data.messageCount) || 0,
    locked: Boolean(data.locked),
    lockedBy: (data.lockedBy as string) || null,
    createdAt: data.createdAt as ChatRoom["createdAt"],
    lastMessageAt: data.lastMessageAt as ChatRoom["lastMessageAt"],
    lockedAt: data.lockedAt as ChatRoom["lockedAt"],
  };
}

export async function getChatRoom(roomId: string): Promise<ChatRoom | null> {
  const snap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.CHAT_ROOMS, roomId));
  if (!snap.exists()) return null;
  return toRoom(snap.id, snap.data());
}

export async function getChatRoomsForInbox(): Promise<ChatRoom[]> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return [];
  const db = getFirebaseDb();

  const [topicSnap, dmSnap] = await Promise.all([
    getDocs(query(collection(db, COLLECTIONS.CHAT_ROOMS), where("type", "==", CHAT_TYPE_TOPIC), limit(100))),
    getDocs(query(collection(db, COLLECTIONS.CHAT_ROOMS), where("type", "==", CHAT_TYPE_DM), where("memberIds", "array-contains", uid), limit(50))),
  ]);

  const rooms = [
    ...topicSnap.docs.map((d) => toRoom(d.id, d.data())),
    ...dmSnap.docs.map((d) => toRoom(d.id, d.data())),
  ];
  return rooms.sort((a, b) => (b.lastMessageAt?.seconds ?? 0) - (a.lastMessageAt?.seconds ?? 0));
}

export function listenChatRooms(
  onUpdate: (rooms: ChatRoom[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return () => {};

  const db = getFirebaseDb();
  let topicRooms: ChatRoom[] = [];
  let dmRooms: ChatRoom[] = [];

  const emit = () => {
    const merged = [...topicRooms, ...dmRooms].sort(
      (a, b) => (b.lastMessageAt?.seconds ?? 0) - (a.lastMessageAt?.seconds ?? 0)
    );
    onUpdate(merged);
  };

  const unsubTopic = onSnapshot(
    query(collection(db, COLLECTIONS.CHAT_ROOMS), where("type", "==", CHAT_TYPE_TOPIC), limit(100)),
    (snap) => {
      topicRooms = snap.docs.map((d) => toRoom(d.id, d.data()));
      emit();
    },
    (err) => onError?.(err)
  );

  const unsubDm = onSnapshot(
    query(collection(db, COLLECTIONS.CHAT_ROOMS), where("type", "==", CHAT_TYPE_DM), where("memberIds", "array-contains", uid), limit(50)),
    (snap) => {
      dmRooms = snap.docs.map((d) => toRoom(d.id, d.data()));
      emit();
    },
    (err) => onError?.(err)
  );

  return () => {
    unsubTopic();
    unsubDm();
  };
}

export function listenMessages(
  roomId: string,
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(getFirebaseDb(), COLLECTIONS.CHAT_ROOMS, roomId, COLLECTIONS.MESSAGES), limit(200)),
    (snap) => {
      const messages = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, "id">) }))
        .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
      onUpdate(messages);
    },
    (err) => onError?.(err)
  );
}

export async function sendChatMessage(roomId: string, text: string): Promise<ChatMessage> {
  const auth = getFirebaseAuth();
  const fbUser = auth.currentUser;
  if (!fbUser) throw new Error("Not logged in");

  const user = await fetchUser(fbUser.uid);
  if (!user) throw new Error("Profile missing");
  const role = resolveRole(user, fbUser.email);
  if (!canPost(role)) throw new Error("You cannot send messages at this time.");

  const t = text.trim();
  if (!t) throw new Error("Message cannot be empty");
  if (t.length > MAX_CHAT_MESSAGE) throw new Error(`Message too long (max ${MAX_CHAT_MESSAGE})`);
  if (containsGifUrl(t)) throw new Error("GIFs and image links are not allowed in chat.");

  const room = await getChatRoom(roomId);
  if (room?.locked && !canModerate(role)) {
    throw new Error("This topic is locked by moderators.");
  }

  const db = getFirebaseDb();
  const roomRef = doc(db, COLLECTIONS.CHAT_ROOMS, roomId);
  const msgRef = doc(collection(roomRef, COLLECTIONS.MESSAGES));
  const now = Timestamp.now();
  const message: ChatMessage = {
    id: msgRef.id,
    authorId: fbUser.uid,
    authorName: user.displayName || fbUser.email?.split("@")[0] || "User",
    authorPhotoUrl: user.photoUrl,
    authorRole: user.role,
    text: t,
    createdAt: now,
    type: "text",
  };

  const batch = writeBatch(db);
  batch.set(msgRef, message);
  batch.update(roomRef, {
    lastMessageAt: now,
    lastMessagePreview: t.slice(0, 120),
    lastMessageAuthorId: fbUser.uid,
    messageCount: increment(1),
  });
  await batch.commit();
  return message;
}

export async function getOrCreateDmRoom(otherUserId: string): Promise<ChatRoom> {
  const me = getFirebaseAuth().currentUser?.uid;
  if (!me) throw new Error("Not logged in");
  if (me === otherUserId) throw new Error("Cannot message yourself");

  const roomId = dmRoomId(me, otherUserId);
  const existing = await getChatRoom(roomId);
  if (existing) return existing;

  const [meUser, otherUser] = await Promise.all([fetchUser(me), fetchUser(otherUserId)]);
  const title = otherUser?.displayName || "Direct Message";
  const room: ChatRoom = {
    id: roomId,
    type: CHAT_TYPE_DM,
    title,
    memberIds: [me, otherUserId],
    createdBy: me,
    createdAt: Timestamp.now(),
    lastMessagePreview: "",
    lastMessageAuthorId: "",
    messageCount: 0,
  };
  try {
    await setDoc(doc(getFirebaseDb(), COLLECTIONS.CHAT_ROOMS, roomId), room);
    return room;
  } catch (err) {
    throw new Error(mapFirestoreError(err instanceof Error ? err.message : "Could not create chat"));
  }
}

export async function getOrCreateTopicRoomByName(categoryName: string): Promise<ChatRoom> {
  const name = categoryName.trim();
  const roomId = topicRoomId(name.toLowerCase().replace(/\s+/g, "_"));
  const existing = await getChatRoom(roomId);
  if (existing) return existing;

  const uid = getFirebaseAuth().currentUser?.uid || "system";
  const room: ChatRoom = {
    id: roomId,
    type: CHAT_TYPE_TOPIC,
    title: name,
    topicName: name,
    topicId: roomId,
    memberIds: [],
    createdBy: uid,
    createdAt: Timestamp.now(),
    lastMessagePreview: "",
    lastMessageAuthorId: "",
    messageCount: 0,
    locked: false,
  };
  await setDoc(doc(getFirebaseDb(), COLLECTIONS.CHAT_ROOMS, roomId), room);
  return room;
}

export async function toggleFavoriteRoom(roomId: string): Promise<boolean> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  const ref = doc(getFirebaseDb(), COLLECTIONS.USERS, uid, "favoriteChats", roomId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await deleteDoc(ref);
    return false;
  }
  await setDoc(ref, { roomId, favoritedAt: Timestamp.now() });
  return true;
}

export async function getFavoriteRoomIds(): Promise<Set<string>> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return new Set();
  const snap = await getDocs(collection(getFirebaseDb(), COLLECTIONS.USERS, uid, "favoriteChats"));
  return new Set(snap.docs.map((d) => d.id));
}

export async function lockTopicRoom(roomId: string, lock: boolean): Promise<void> {
  const auth = getFirebaseAuth();
  const user = await fetchUser(auth.currentUser?.uid || "");
  if (!canModerate(resolveRole(user, auth.currentUser?.email))) {
    throw new Error("No permission");
  }
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.CHAT_ROOMS, roomId), {
    locked: lock,
    lockedBy: lock ? auth.currentUser?.uid : "",
    lockedAt: Timestamp.now(),
  });
}

export async function getTopicRooms(max = 100): Promise<ChatRoom[]> {
  const snap = await getDocs(
    query(
      collection(getFirebaseDb(), COLLECTIONS.CHAT_ROOMS),
      where("type", "==", CHAT_TYPE_TOPIC),
      limit(max)
    )
  );
  return snap.docs
    .map((d) => toRoom(d.id, d.data()))
    .sort((a, b) => (b.lastMessageAt?.seconds ?? 0) - (a.lastMessageAt?.seconds ?? 0));
}

export function searchChatRooms(q: string, rooms: ChatRoom[], max = 20): ChatRoom[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return rooms
    .filter(
      (r) =>
        r.title.toLowerCase().includes(needle) ||
        r.topicName?.toLowerCase().includes(needle) ||
        r.lastMessagePreview.toLowerCase().includes(needle)
    )
    .slice(0, max);
}