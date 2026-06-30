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
import { chatRoomDisplayTitle } from "@/lib/chatDisplay";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS, MAX_CHAT_MESSAGE } from "@/lib/constants";
import {
  chatMessagePreview,
  chatMessageType,
  containsGifUrl,
  dmRoomId,
  mapFirestoreError,
  normalizeCategoryName,
  normalizeMediaTypeForFirestore,
  resolveRole,
  topicRoomId,
} from "@/lib/utils";
import {
  CHAT_TYPE_DM,
  CHAT_TYPE_GROUP,
  CHAT_TYPE_TOPIC,
  canModerate,
  canPost,
  type ChatMessage,
  type ChatRoom,
} from "@/models";
import { fetchFirestoreRole, fetchUser } from "./authService";
import { excludeBlockedUserIds, getBlockedUserIds, isBlockedEitherWay } from "./blockService";

function toRoom(id: string, data: Record<string, unknown>): ChatRoom {
  const rawType = typeof data.type === "string" ? data.type.toLowerCase() : "";
  const type =
    rawType === CHAT_TYPE_DM || rawType === CHAT_TYPE_GROUP || rawType === CHAT_TYPE_TOPIC
      ? rawType
      : id.startsWith("dm_")
        ? CHAT_TYPE_DM
        : id.startsWith("group_")
          ? CHAT_TYPE_GROUP
          : id.startsWith("topic_")
            ? CHAT_TYPE_TOPIC
            : CHAT_TYPE_TOPIC;
  return {
    id,
    type,
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
    voiceLocked: Boolean(data.voiceLocked),
    activeVoiceSessionId: (data.activeVoiceSessionId as string) || null,
    createdAt: data.createdAt as ChatRoom["createdAt"],
    lastMessageAt: data.lastMessageAt as ChatRoom["lastMessageAt"],
    lockedAt: data.lockedAt as ChatRoom["lockedAt"],
  };
}

export async function getChatRoom(roomId: string): Promise<ChatRoom | null> {
  try {
    const snap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.CHAT_ROOMS, roomId));
    if (!snap.exists()) return null;
    return toRoom(snap.id, snap.data());
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission-denied")) {
      return null;
    }
    throw err;
  }
}

export async function getChatRoomsForInbox(): Promise<ChatRoom[]> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return [];
  const db = getFirebaseDb();

  const [topicSnap, dmSnap, groupSnap] = await Promise.all([
    getDocs(query(collection(db, COLLECTIONS.CHAT_ROOMS), where("type", "==", CHAT_TYPE_TOPIC), limit(100))),
    getDocs(query(collection(db, COLLECTIONS.CHAT_ROOMS), where("type", "==", CHAT_TYPE_DM), where("memberIds", "array-contains", uid), limit(50))),
    getDocs(query(collection(db, COLLECTIONS.CHAT_ROOMS), where("type", "==", CHAT_TYPE_GROUP), where("memberIds", "array-contains", uid), limit(50))),
  ]);

  const blockedIds = await getBlockedUserIds();
  const rooms = [
    ...topicSnap.docs.map((d) => toRoom(d.id, d.data())),
    ...excludeBlockedUserIds(
      dmSnap.docs.map((d) => toRoom(d.id, d.data())),
      blockedIds,
      (room) => room.memberIds.find((id) => id !== uid) || ""
    ),
    ...groupSnap.docs.map((d) => toRoom(d.id, d.data())),
  ];
  return rooms.sort((a, b) => (b.lastMessageAt?.seconds ?? 0) - (a.lastMessageAt?.seconds ?? 0));
}

export async function getRecentDmRooms(max = 12): Promise<ChatRoom[]> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return [];
  const snap = await getDocs(
    query(
      collection(getFirebaseDb(), COLLECTIONS.CHAT_ROOMS),
      where("type", "==", CHAT_TYPE_DM),
      where("memberIds", "array-contains", uid),
      limit(max)
    )
  );
  const blockedIds = await getBlockedUserIds();
  return excludeBlockedUserIds(
    snap.docs.map((d) => toRoom(d.id, d.data())),
    blockedIds,
    (room) => room.memberIds.find((id) => id !== uid) || ""
  ).sort((a, b) => (b.lastMessageAt?.seconds ?? 0) - (a.lastMessageAt?.seconds ?? 0));
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
  let groupRooms: ChatRoom[] = [];

  const emit = () => {
    const merged = [...topicRooms, ...dmRooms, ...groupRooms].sort(
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

  const unsubGroup = onSnapshot(
    query(collection(db, COLLECTIONS.CHAT_ROOMS), where("type", "==", CHAT_TYPE_GROUP), where("memberIds", "array-contains", uid), limit(50)),
    (snap) => {
      groupRooms = snap.docs.map((d) => toRoom(d.id, d.data()));
      emit();
    },
    (err) => onError?.(err)
  );

  return () => {
    unsubTopic();
    unsubDm();
    unsubGroup();
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

export async function sendChatMessage(
  roomId: string,
  text: string,
  options?: { imageUrl?: string | null; mediaType?: string | null }
): Promise<ChatMessage> {
  const auth = getFirebaseAuth();
  const fbUser = auth.currentUser;
  if (!fbUser) throw new Error("Not logged in");

  let user = await fetchUser(fbUser.uid);
  if (!user) {
    const { loadCurrentUserAndCheckBan } = await import("./authService");
    user = await loadCurrentUserAndCheckBan(fbUser.uid, fbUser.email);
  }

  const role = resolveRole(user, fbUser.email);
  if (!canPost(role)) throw new Error("You cannot send messages at this time.");

  const t = text.trim();
  const imageUrl = options?.imageUrl?.trim() || null;
  const resolvedMediaType = imageUrl
    ? normalizeMediaTypeForFirestore(options?.mediaType, imageUrl) || "image"
    : null;

  if (!t && !imageUrl) throw new Error("Message cannot be empty");
  if (t.length > MAX_CHAT_MESSAGE) throw new Error(`Message too long (max ${MAX_CHAT_MESSAGE})`);
  if (t && containsGifUrl(t)) {
    throw new Error("GIFs and image links are not allowed in message text. Use attach instead.");
  }

  const room = await getChatRoom(roomId);
  if (room?.locked && !canModerate(role)) {
    throw new Error("This topic is locked by moderators.");
  }

  const db = getFirebaseDb();
  const roomRef = doc(db, COLLECTIONS.CHAT_ROOMS, roomId);
  const msgRef = doc(collection(roomRef, COLLECTIONS.MESSAGES));
  const now = Timestamp.now();
  const authorRole = await fetchFirestoreRole(fbUser.uid);
  const message: ChatMessage = {
    id: msgRef.id,
    authorId: fbUser.uid,
    authorName: user.displayName || fbUser.email?.split("@")[0] || "User",
    ...(user.photoUrl ? { authorPhotoUrl: user.photoUrl } : {}),
    authorRole,
    text: t,
    ...(imageUrl ? { imageUrl, mediaType: resolvedMediaType } : {}),
    createdAt: now,
    type: chatMessageType(resolvedMediaType, imageUrl),
  };

  const preview = chatMessagePreview(t, resolvedMediaType);

  const batch = writeBatch(db);
  batch.set(msgRef, message);
  batch.update(roomRef, {
    lastMessageAt: now,
    lastMessagePreview: preview,
    lastMessageAuthorId: fbUser.uid,
    messageCount: increment(1),
  });
  try {
    await batch.commit();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send message";
    throw new Error(mapFirestoreError(message));
  }
  return message;
}

export async function createGroupRoom(title: string, memberIds: string[]): Promise<ChatRoom> {
  const me = getFirebaseAuth().currentUser?.uid;
  if (!me) throw new Error("Not logged in");

  const trimmed = title.trim();
  if (trimmed.length < 2) throw new Error("Group name too short");
  if (trimmed.length > 80) throw new Error("Group name too long");

  const uniqueMembers = [...new Set([me, ...memberIds])];
  if (uniqueMembers.length < 2) throw new Error("Add at least one friend");
  if (uniqueMembers.length > 25) throw new Error("Groups support up to 25 members");

  const roomId = `group_${crypto.randomUUID().replace(/-/g, "")}`;
  const now = Timestamp.now();
  const room: ChatRoom = {
    id: roomId,
    type: CHAT_TYPE_GROUP,
    title: trimmed,
    memberIds: uniqueMembers,
    createdBy: me,
    createdAt: now,
    lastMessageAt: now,
    lastMessagePreview: "",
    lastMessageAuthorId: "",
    messageCount: 0,
    voiceLocked: false,
  };

  const { id: _id, ...roomData } = room;
  await setDoc(doc(getFirebaseDb(), COLLECTIONS.CHAT_ROOMS, roomId), roomData);
  return room;
}

export async function getOrCreateDmRoom(otherUserId: string): Promise<ChatRoom> {
  const me = getFirebaseAuth().currentUser?.uid;
  if (!me) throw new Error("Not logged in");
  if (me === otherUserId) throw new Error("Cannot message yourself");
  if (await isBlockedEitherWay(otherUserId)) {
    throw new Error("You cannot message this user");
  }

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
  const { id: _id, ...roomData } = room;
  try {
    await setDoc(doc(getFirebaseDb(), COLLECTIONS.CHAT_ROOMS, roomId), roomData);
    return room;
  } catch (err) {
    throw new Error(mapFirestoreError(err instanceof Error ? err.message : "Could not create chat"));
  }
}

async function resolveTopicCategoryId(categoryName: string): Promise<string> {
  const name = categoryName.trim();
  const normalized = normalizeCategoryName(name);
  const db = getFirebaseDb();

  try {
    const normSnap = await getDocs(
      query(collection(db, COLLECTIONS.CATEGORIES), where("normalizedName", "==", normalized), limit(1))
    );
    if (!normSnap.empty) return normSnap.docs[0]!.id;
  } catch {
    // non-fatal
  }

  try {
    const snap = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
    const match = snap.docs.find(
      (d) => (d.data().name as string | undefined)?.toLowerCase() === name.toLowerCase()
    );
    if (match) return match.id;
  } catch {
    // Registered categories optional — fall back to normalized slug.
  }
  return normalized;
}

function topicRoomCandidateIds(categoryId: string, categoryName: string): string[] {
  const normalized = normalizeCategoryName(categoryName);
  return [...new Set([categoryId, normalized].filter(Boolean))];
}

async function isTopicBanned(categoryName: string): Promise<boolean> {
  const lower = categoryName.trim().toLowerCase();
  if (!lower) return false;
  try {
    const snap = await getDocs(collection(getFirebaseDb(), COLLECTIONS.HIDDEN_TOPICS));
    return snap.docs.some((d) => (d.data().name as string | undefined)?.toLowerCase() === lower);
  } catch {
    return false;
  }
}

async function findTopicRoomByName(categoryName: string): Promise<ChatRoom | null> {
  const name = categoryName.trim();
  if (!name) return null;

  const slugRoom = await getChatRoom(topicRoomId(normalizeCategoryName(name)));
  if (slugRoom) return slugRoom;

  const db = getFirebaseDb();
  const exactSnap = await getDocs(
    query(
      collection(db, COLLECTIONS.CHAT_ROOMS),
      where("type", "==", CHAT_TYPE_TOPIC),
      where("topicName", "==", name),
      limit(1)
    )
  );
  if (!exactSnap.empty) {
    const docSnap = exactSnap.docs[0]!;
    return toRoom(docSnap.id, docSnap.data());
  }

  const lower = name.toLowerCase();
  const topicSnap = await getDocs(
    query(collection(db, COLLECTIONS.CHAT_ROOMS), where("type", "==", CHAT_TYPE_TOPIC), limit(100))
  );
  const match = topicSnap.docs.find((d) => {
    const data = d.data();
    const topicName = (data.topicName as string) || (data.title as string) || "";
    return topicName.toLowerCase() === lower;
  });
  if (!match) return null;
  return toRoom(match.id, match.data());
}

export async function getOrCreateTopicRoom(
  categoryId: string,
  categoryName: string
): Promise<ChatRoom> {
  const name = categoryName.trim();
  if (!name) throw new Error("Topic name required");

  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  if (await isTopicBanned(name)) {
    throw new Error("This topic is banned by moderators.");
  }

  for (const id of topicRoomCandidateIds(categoryId, name)) {
    const existing = await getChatRoom(topicRoomId(id));
    if (existing) return existing;
  }

  const byName = await findTopicRoomByName(name);
  if (byName) return byName;

  const roomId = topicRoomId(categoryId);
  const now = Timestamp.now();
  const room: ChatRoom = {
    id: roomId,
    type: CHAT_TYPE_TOPIC,
    title: name,
    topicName: name,
    topicId: categoryId,
    memberIds: [],
    createdBy: uid,
    createdAt: now,
    lastMessageAt: now,
    lastMessagePreview: "",
    lastMessageAuthorId: "",
    messageCount: 0,
    locked: false,
  };

  const { id: _id, ...roomData } = room;

  try {
    await setDoc(doc(getFirebaseDb(), COLLECTIONS.CHAT_ROOMS, roomId), roomData);
    return room;
  } catch (err) {
    const fallback = await findTopicRoomByName(name);
    if (fallback) return fallback;
    const message = err instanceof Error ? err.message : "Could not open topic chat";
    throw new Error(mapFirestoreError(message));
  }
}

export async function getOrCreateTopicRoomByName(categoryName: string): Promise<ChatRoom> {
  const categoryId = await resolveTopicCategoryId(categoryName);
  return getOrCreateTopicRoom(categoryId, categoryName);
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

export function searchChatRooms(
  q: string,
  rooms: ChatRoom[],
  max = 20,
  options?: { myUid?: string; displayNamesByUid?: Record<string, string> }
): ChatRoom[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];

  const { myUid, displayNamesByUid = {} } = options ?? {};

  return rooms
    .filter((r) => {
      const titleLabel =
        myUid != null
          ? chatRoomDisplayTitle(r, myUid, displayNamesByUid).toLowerCase()
          : r.title.toLowerCase();
      return (
        titleLabel.includes(needle) ||
        r.topicName?.toLowerCase().includes(needle) ||
        r.lastMessagePreview.toLowerCase().includes(needle)
      );
    })
    .slice(0, max);
}
