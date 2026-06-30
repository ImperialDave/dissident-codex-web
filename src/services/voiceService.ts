import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  limit,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getFirebaseAuth, getFirebaseDb, getFirebaseFunctions } from "@/lib/firebase";
import { mapCallableError } from "@/lib/utils";
import { isBlockedEitherWay } from "./blockService";
import { COLLECTIONS, VOICE_MAX_DM, VOICE_MAX_GROUP, VOICE_MAX_TOPIC } from "@/lib/constants";
import {
  CHAT_TYPE_DM,
  CHAT_TYPE_GROUP,
  CHAT_TYPE_TOPIC,
  VOICE_TYPE_DM,
  VOICE_TYPE_GROUP,
  VOICE_TYPE_TOPIC,
  type VoiceSession,
  type VoiceSessionStatus,
} from "@/models";
import type { ChatRoom } from "@/models";

function toVoiceSession(id: string, data: Record<string, unknown>): VoiceSession {
  return {
    id,
    chatRoomId: (data.chatRoomId as string) || "",
    voiceType: (data.voiceType as string) || VOICE_TYPE_TOPIC,
    livekitRoom: (data.livekitRoom as string) || "",
    status: (data.status as VoiceSessionStatus) || "ended",
    createdBy: (data.createdBy as string) || "",
    calleeUid: (data.calleeUid as string) || null,
    createdAt: data.createdAt as VoiceSession["createdAt"],
    startedAt: data.startedAt as VoiceSession["startedAt"],
    endedAt: data.endedAt as VoiceSession["endedAt"],
    endedBy: (data.endedBy as string) || null,
    maxParticipants: Number(data.maxParticipants) || VOICE_MAX_TOPIC,
    participants: (data.participants as VoiceSession["participants"]) || {},
  };
}

function voiceTypeForRoom(room: ChatRoom): string {
  if (room.type === CHAT_TYPE_DM) return VOICE_TYPE_DM;
  if (room.type === CHAT_TYPE_GROUP) return VOICE_TYPE_GROUP;
  return VOICE_TYPE_TOPIC;
}

function maxParticipantsForRoom(room: ChatRoom): number {
  if (room.type === CHAT_TYPE_DM) return VOICE_MAX_DM;
  if (room.type === CHAT_TYPE_GROUP) return VOICE_MAX_GROUP;
  return VOICE_MAX_TOPIC;
}

function parseDmMemberIds(roomId: string, myUid: string): string | null {
  if (!roomId.startsWith("dm_")) return null;
  const parts = roomId.slice(3).split("_").filter(Boolean);
  if (parts.length !== 2 || !parts.includes(myUid)) return null;
  return parts.find((id) => id !== myUid) ?? null;
}

function otherDmUid(room: ChatRoom, myUid: string): string | null {
  const normalizedType =
    room.type === CHAT_TYPE_DM || room.id.startsWith("dm_") ? CHAT_TYPE_DM : room.type;
  if (normalizedType !== CHAT_TYPE_DM) return null;
  const other = room.memberIds.find((id) => id !== myUid);
  return other || parseDmMemberIds(room.id, myUid);
}

function isFirestorePermissionError(err: unknown): boolean {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code ?? "")
      : "";
  const message = err instanceof Error ? err.message : String(err ?? "");
  return code === "permission-denied" || message.includes("permission");
}

export async function getVoiceSession(sessionId: string): Promise<VoiceSession | null> {
  const snap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.VOICE_SESSIONS, sessionId));
  if (!snap.exists()) return null;
  return toVoiceSession(snap.id, snap.data());
}

function pickActiveSession(sessions: VoiceSession[]): VoiceSession | null {
  return sessions.find((s) => s.status === "ringing" || s.status === "active") ?? null;
}

export async function getActiveVoiceSessionForRoom(chatRoomId: string): Promise<VoiceSession | null> {
  // Prefer single-doc reads (avoids list-query permission failures from orphan sessions).
  try {
    const roomSnap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.CHAT_ROOMS, chatRoomId));
    const activeId = roomSnap.exists()
      ? (roomSnap.data().activeVoiceSessionId as string | undefined)
      : undefined;
    if (activeId) {
      const linked = await getVoiceSession(activeId);
      if (linked && (linked.status === "ringing" || linked.status === "active")) {
        return linked;
      }
    }
  } catch (err) {
    if (!isFirestorePermissionError(err)) throw err;
  }

  try {
    const snap = await getDocs(
      query(
        collection(getFirebaseDb(), COLLECTIONS.VOICE_SESSIONS),
        where("chatRoomId", "==", chatRoomId),
        limit(5)
      )
    );
    return pickActiveSession(snap.docs.map((d) => toVoiceSession(d.id, d.data())));
  } catch (err) {
    if (isFirestorePermissionError(err)) return null;
    throw err;
  }
}

export function listenVoiceSession(
  sessionId: string,
  onUpdate: (session: VoiceSession | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), COLLECTIONS.VOICE_SESSIONS, sessionId),
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      onUpdate(toVoiceSession(snap.id, snap.data()));
    },
    (err) => onError?.(err)
  );
}

export function listenIncomingDmCalls(
  uid: string,
  onUpdate: (sessions: VoiceSession[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!uid) return () => {};

  // Single-field query (calleeUid) matches security rules without a composite index.
  return onSnapshot(
    query(
      collection(getFirebaseDb(), COLLECTIONS.VOICE_SESSIONS),
      where("calleeUid", "==", uid),
      limit(10)
    ),
    (snap) => {
      const ringingDm = snap.docs
        .map((d) => toVoiceSession(d.id, d.data()))
        .filter((s) => s.voiceType === VOICE_TYPE_DM && s.status === "ringing");
      onUpdate(ringingDm);
    },
    (err) => onError?.(err)
  );
}

async function linkSessionToRoom(chatRoomId: string, sessionId: string): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.CHAT_ROOMS, chatRoomId), {
    activeVoiceSessionId: sessionId,
  });
}

export async function startDmVoiceCall(room: ChatRoom): Promise<VoiceSession> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  if (room.type !== CHAT_TYPE_DM) throw new Error("Voice calls are for direct messages only.");
  if (room.voiceLocked) throw new Error("Voice is locked in this room.");

  const existing = await getActiveVoiceSessionForRoom(room.id);
  if (existing) return existing;

  const calleeUid = otherDmUid(room, uid);
  if (!calleeUid) throw new Error("Could not resolve callee.");
  if (await isBlockedEitherWay(calleeUid)) {
    throw new Error("You cannot call this user");
  }

  const now = Timestamp.now();
  const sessionRef = doc(collection(getFirebaseDb(), COLLECTIONS.VOICE_SESSIONS));
  const session: VoiceSession = {
    id: sessionRef.id,
    chatRoomId: room.id,
    voiceType: VOICE_TYPE_DM,
    livekitRoom: room.id,
    status: "ringing",
    createdBy: uid,
    calleeUid,
    createdAt: now,
    maxParticipants: VOICE_MAX_DM,
    participants: {
      [uid]: { joinedAt: now, muted: false, role: "host" },
    },
  };

  const { id, ...data } = session;
  await setDoc(sessionRef, data);
  await linkSessionToRoom(room.id, session.id);
  return session;
}

export async function joinTopicOrGroupVoice(room: ChatRoom): Promise<VoiceSession> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  if (room.type !== CHAT_TYPE_TOPIC && room.type !== CHAT_TYPE_GROUP) {
    throw new Error("Use call for direct messages.");
  }
  if (room.voiceLocked) throw new Error("Voice is locked in this room.");

  const existing = await getActiveVoiceSessionForRoom(room.id);
  if (existing) {
    await markParticipantJoined(existing.id, uid);
    return (await getVoiceSession(existing.id)) ?? existing;
  }

  const now = Timestamp.now();
  const sessionRef = doc(collection(getFirebaseDb(), COLLECTIONS.VOICE_SESSIONS));
  const voiceType = voiceTypeForRoom(room);
  const session: VoiceSession = {
    id: sessionRef.id,
    chatRoomId: room.id,
    voiceType,
    livekitRoom: room.id,
    status: "active",
    createdBy: uid,
    createdAt: now,
    startedAt: now,
    maxParticipants: maxParticipantsForRoom(room),
    participants: {
      [uid]: { joinedAt: now, muted: false, role: "host" },
    },
  };

  const { id, ...data } = session;
  await setDoc(sessionRef, data);
  await linkSessionToRoom(room.id, session.id);
  return session;
}

export async function acceptDmVoiceCall(session: VoiceSession): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  if (session.calleeUid !== uid) throw new Error("Not the callee.");
  if (session.status !== "ringing") throw new Error("Call is no longer ringing.");

  const now = Timestamp.now();
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.VOICE_SESSIONS, session.id), {
    status: "active",
    startedAt: now,
    [`participants.${uid}`]: { joinedAt: now, muted: false, role: "member" },
  });
}

export async function declineDmVoiceCall(session: VoiceSession): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  if (session.status !== "ringing") return;

  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.VOICE_SESSIONS, session.id), {
    status: "ended",
    endedAt: Timestamp.now(),
    endedBy: uid,
  });
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.CHAT_ROOMS, session.chatRoomId), {
    activeVoiceSessionId: null,
  });
}

export async function markParticipantJoined(sessionId: string, uid: string): Promise<void> {
  const now = Timestamp.now();
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.VOICE_SESSIONS, sessionId), {
    [`participants.${uid}`]: { joinedAt: now, muted: false, role: "member" },
  });
}

export async function markParticipantLeft(sessionId: string, uid: string): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.VOICE_SESSIONS, sessionId), {
    [`participants.${uid}.leftAt`]: Timestamp.now(),
  });
}

export function countActiveVoiceParticipants(session: VoiceSession): number {
  return Object.values(session.participants).filter((p) => p && !p.leftAt).length;
}

export function isDmVoiceSession(session: VoiceSession): boolean {
  return session.voiceType === VOICE_TYPE_DM;
}

/** Leave a topic/group voice session without ending it for others. Ends only when last participant leaves. */
export async function leaveVoiceSession(session: VoiceSession): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");

  await markParticipantLeft(session.id, uid);

  const updated = (await getVoiceSession(session.id)) ?? session;
  if (updated.status === "ended") return;

  const activeCount = countActiveVoiceParticipants(updated);
  if (activeCount > 0) return;

  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.VOICE_SESSIONS, session.id), {
    status: "ended",
    endedAt: Timestamp.now(),
    endedBy: uid,
  });
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.CHAT_ROOMS, session.chatRoomId), {
    activeVoiceSessionId: null,
  });

  try {
    await endVoiceSessionRemote(session.id);
  } catch {
    // LiveKit cleanup is best-effort when the room is already empty.
  }
}

export async function endVoiceSessionLocal(session: VoiceSession): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");

  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.VOICE_SESSIONS, session.id), {
    status: "ended",
    endedAt: Timestamp.now(),
    endedBy: uid,
    [`participants.${uid}.leftAt`]: Timestamp.now(),
  });
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.CHAT_ROOMS, session.chatRoomId), {
    activeVoiceSessionId: null,
  });
}

export interface VoiceTokenResult {
  token: string;
  url: string;
  roomName: string;
}

export async function fetchVoiceToken(
  sessionId: string,
  displayName: string
): Promise<VoiceTokenResult> {
  try {
    const fn = httpsCallable(getFirebaseFunctions(), "createVoiceToken");
    const result = await fn({ sessionId, displayName });
    const data = result.data as VoiceTokenResult;
    if (!data?.token || !data?.url) {
      throw new Error("Could not get voice token. Is LiveKit configured?");
    }
    return data;
  } catch (err) {
    throw new Error(mapCallableError(err));
  }
}

export async function endVoiceSessionRemote(sessionId: string): Promise<void> {
  try {
    const fn = httpsCallable(getFirebaseFunctions(), "endVoiceSession");
    await fn({ sessionId });
  } catch (err) {
    throw new Error(mapCallableError(err));
  }
}
