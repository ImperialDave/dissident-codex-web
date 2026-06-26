import { fetchUser } from "@/services/authService";
import { CHAT_TYPE_DM, type ChatRoom } from "@/models";

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