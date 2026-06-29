import { fetchUser } from "@/services/authService";
import {
  CHAT_TYPE_DM,
  CHAT_TYPE_GROUP,
  CHAT_TYPE_TOPIC,
  type ChatRoom,
} from "@/models";

export function sortChatRooms(rooms: ChatRoom[], favoriteIds: Set<string>): ChatRoom[] {
  return [...rooms].sort((a, b) => {
    const af = favoriteIds.has(a.id) ? 1 : 0;
    const bf = favoriteIds.has(b.id) ? 1 : 0;
    if (af !== bf) return bf - af;
    return (b.lastMessageAt?.seconds ?? 0) - (a.lastMessageAt?.seconds ?? 0);
  });
}

/** Inbox buckets: DMs, invite-only groups, and topic communities (public chats). */
export function groupChatRoomsByType(rooms: ChatRoom[]): {
  dms: ChatRoom[];
  privateGroups: ChatRoom[];
  communities: ChatRoom[];
} {
  const dms: ChatRoom[] = [];
  const privateGroups: ChatRoom[] = [];
  const communities: ChatRoom[] = [];

  for (const room of rooms) {
    if (room.type === CHAT_TYPE_DM) dms.push(room);
    else if (room.type === CHAT_TYPE_GROUP) privateGroups.push(room);
    else if (room.type === CHAT_TYPE_TOPIC) communities.push(room);
  }

  return { dms, privateGroups, communities };
}

export function isDmRoom(room: ChatRoom): boolean {
  return room.type === CHAT_TYPE_DM || room.id.startsWith("dm_");
}

export function otherDmMemberId(room: ChatRoom, myUid: string): string | null {
  if (!isDmRoom(room)) return null;

  const fromMembers = room.memberIds.find((id) => id !== myUid);
  if (fromMembers) return fromMembers;

  const parts = room.id.slice(3).split("_").filter(Boolean);
  if (parts.length === 2 && parts.includes(myUid)) {
    return parts.find((id) => id !== myUid) ?? null;
  }
  return null;
}

export function chatRoomDisplayTitle(
  room: ChatRoom,
  myUid: string,
  displayNamesByUid: Record<string, string>
): string {
  const otherId = otherDmMemberId(room, myUid);
  if (otherId) {
    return displayNamesByUid[otherId] || "Direct Message";
  }
  return room.title || "Chat";
}

export async function resolveDmDisplayNames(
  rooms: ChatRoom[],
  myUid: string
): Promise<Record<string, string>> {
  const otherIds = [
    ...new Set(
      rooms
        .map((room) => otherDmMemberId(room, myUid))
        .filter((id): id is string => Boolean(id))
    ),
  ];

  if (otherIds.length === 0) return {};

  const entries = await Promise.all(
    otherIds.map(async (uid) => {
      const user = await fetchUser(uid);
      return [uid, user?.displayName || "Direct Message"] as const;
    })
  );

  return Object.fromEntries(entries);
}
