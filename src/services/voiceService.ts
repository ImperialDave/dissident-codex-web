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

function otherDmUid(room: ChatRoom, myUid: string): string | null {
  if (room.type !== CHAT_TYPE_DM) return null;
  const other = room.memberIds.find((id) => id !== myUid);
  return other || null;
}

export async function getVoiceSession(sessionId: string): Promise<VoiceSession | null> {
  const snap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.VOICE_SESSIONS, sessionId));
  if (!snap.exists()) return null;
  return toVoiceSession(snap.id, snap.data());
}

export async function getActiveVoiceSessionForRoom(chatRoomId: string): Promise<VoiceSession | null> {
  const snap = await getDocs(
    query(
      collection(getFirebaseDb(), COLLECTIONS.VOICE_SESSIONS),
      where("chatRoomId", "==", chatRoomId),
      limit(5)
    )
  );
  const active = snap.docs
    .map((d) => toVoiceSession(d.id, d.data()))
    .find((s) => s.status === "ringing" || s.status === "active");
  return active ?? null;
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
