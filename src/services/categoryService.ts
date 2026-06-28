import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  limit,
  where,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import {
  ALL_CATEGORY_LABEL,
  COLLECTIONS,
  MAX_FAVORITE_CATEGORIES,
  SEARCH_POPULAR_CHATS_LIMIT,
  SEARCH_POPULAR_TOPICS_LIMIT,
} from "@/lib/constants";
import {
  canModerate,
  CHAT_TYPE_TOPIC,
  type BannedTopic,
  type FavoriteCategory,
  type FeedHiddenTopic,
  type LeaderboardData,
  type LeaderboardEntry,
  type PostCategory,
} from "@/models";
import { fetchUser } from "./authService";
import { normalizeCategoryName, resolveRole } from "@/lib/utils";
import { getChatRoomsForInbox, getOrCreateTopicRoom } from "./chatService";
import type { ChatRoom } from "@/models";

export async function getCategories(): Promise<PostCategory[]> {
  const snap = await getDocs(collection(getFirebaseDb(), COLLECTIONS.CATEGORIES));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PostCategory, "id">) }));
}

async function collectTopicNames(): Promise<Set<string>> {
  const names = new Set((await getCategories()).map((c) => c.name).filter(Boolean));
  try {
    const postsSnap = await getDocs(
      query(collection(getFirebaseDb(), COLLECTIONS.POSTS), limit(200))
    );
    for (const d of postsSnap.docs) {
      const cat = d.data().category;
      if (typeof cat === "string" && cat.trim()) names.add(cat.trim());
    }
  } catch {
    // non-fatal
  }
  return names;
}

export async function getFeedHiddenTopics(): Promise<FeedHiddenTopic[]> {
  try {
    const snap = await getDocs(collection(getFirebaseDb(), COLLECTIONS.FEED_HIDDEN_TOPICS));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FeedHiddenTopic, "id">) }));
  } catch {
    // Rules may lag deploy — treat as none hidden so feed still loads.
    return [];
  }
}

export async function getAllTopicNames(): Promise<string[]> {
  return [...(await collectTopicNames())].sort((a, b) => a.localeCompare(b));
}

export async function getFeedCategoryNames(options?: {
  includeFeedHidden?: boolean;
}): Promise<string[]> {
  const banned = new Set((await getBannedTopics()).map((t) => t.name.toLowerCase()));
  const feedHidden = new Set((await getFeedHiddenTopics()).map((t) => t.name.toLowerCase()));
  const names = await collectTopicNames();
  const visible = [...names]
    .filter((name) => !banned.has(name.toLowerCase()))
    .filter(
      (name) =>
        options?.includeFeedHidden || !feedHidden.has(name.toLowerCase())
    )
    .sort((a, b) => a.localeCompare(b));
  return [ALL_CATEGORY_LABEL, ...visible];
}

export async function getCreateCategoryNames(): Promise<string[]> {
  const names = await getFeedCategoryNames();
  return names.filter((name) => name !== ALL_CATEGORY_LABEL);
}

export async function getBannedTopics(): Promise<BannedTopic[]> {
  try {
    const snap = await getDocs(collection(getFirebaseDb(), COLLECTIONS.HIDDEN_TOPICS));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BannedTopic, "id">) }));
  } catch {
    return [];
  }
}

export async function searchTopics(q: string, max = 20): Promise<PostCategory[]> {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];

  const names = new Set<string>();
  try {
    for (const c of await getCategories()) {
      if (c.name?.trim()) names.add(c.name.trim());
    }
  } catch {
    // Registered categories optional — still search post topics below.
  }

  try {
    const postsSnap = await getDocs(
      query(collection(getFirebaseDb(), COLLECTIONS.POSTS), limit(200))
    );
    for (const d of postsSnap.docs) {
      const cat = d.data().category;
      if (typeof cat === "string" && cat.trim()) names.add(cat.trim());
    }
  } catch {
    // non-fatal
  }

  let banned = new Set<string>();
  let feedHidden = new Set<string>();
  try {
    banned = new Set((await getBannedTopics()).map((t) => t.name.toLowerCase()));
    feedHidden = new Set((await getFeedHiddenTopics()).map((t) => t.name.toLowerCase()));
  } catch {
    // non-fatal
  }

  return [...names]
    .filter((name) => !banned.has(name.toLowerCase()))
    .filter((name) => !feedHidden.has(name.toLowerCase()))
    .filter((name) => name.toLowerCase().includes(needle))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, max)
    .map((name, index) => ({ id: `search-topic-${index}`, name }));
}

export async function createCategory(name: string): Promise<PostCategory> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name required");
  if (trimmed.length > 40) throw new Error("Category name too long (max 40)");

  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");

  const normalized = normalizeCategoryName(trimmed);
  const db = getFirebaseDb();

  try {
    const existing = await getDocs(
      query(collection(db, COLLECTIONS.CATEGORIES), where("normalizedName", "==", normalized), limit(1))
    );
    if (!existing.empty) {
      const docSnap = existing.docs[0]!;
      const category = { id: docSnap.id, ...(docSnap.data() as Omit<PostCategory, "id">) };
      try {
        await getOrCreateTopicRoom(category.id, category.name || trimmed);
      } catch {
        // non-fatal
      }
      return category;
    }
  } catch {
    // continue with create
  }

  const ref = doc(collection(db, COLLECTIONS.CATEGORIES));
  const now = Timestamp.now();
  await setDoc(ref, {
    name: trimmed,
    normalizedName: normalized,
    createdBy: uid,
    createdAt: now,
  });
  const category: PostCategory = { id: ref.id, name: trimmed, createdAt: now };
  try {
    await getOrCreateTopicRoom(ref.id, trimmed);
  } catch {
    // non-fatal
  }
  return category;
}

async function findCategoryByName(name: string): Promise<PostCategory | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const normalized = normalizeCategoryName(trimmed);
  const db = getFirebaseDb();

  try {
    const normSnap = await getDocs(
      query(collection(db, COLLECTIONS.CATEGORIES), where("normalizedName", "==", normalized), limit(1))
    );
    if (!normSnap.empty) {
      const docSnap = normSnap.docs[0]!;
      return { id: docSnap.id, ...(docSnap.data() as Omit<PostCategory, "id">) };
    }
  } catch {
    // non-fatal
  }

  const existing = (await getCategories()).find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase()
  );
  return existing ?? null;
}

export async function resolveOrCreateCategory(name: string): Promise<PostCategory> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category is required");

  const existing = await findCategoryByName(trimmed);
  if (existing) {
    try {
      await getOrCreateTopicRoom(existing.id, existing.name);
    } catch {
      // non-fatal
    }
    return existing;
  }

  return createCategory(trimmed);
}

export async function ensureTopicChatRoom(categoryName: string): Promise<ChatRoom> {
  const category = await resolveOrCreateCategory(categoryName);
  return getOrCreateTopicRoom(category.id, category.name);
}

export async function banTopic(name: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = await fetchUser(auth.currentUser?.uid || "");
  if (!canModerate(resolveRole(user, auth.currentUser?.email))) {
    throw new Error("No permission");
  }
  const trimmed = name.trim();
  const key = normalizeCategoryName(trimmed);
  if (!key) throw new Error("Invalid topic name");
  const ref = doc(getFirebaseDb(), COLLECTIONS.HIDDEN_TOPICS, key);
  await setDoc(ref, {
    name: trimmed,
    bannedAt: Timestamp.now(),
    hiddenAt: Timestamp.now(),
    ...(auth.currentUser?.uid ? { hiddenBy: auth.currentUser.uid } : {}),
  });
}

export async function unbanTopic(id: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.HIDDEN_TOPICS, id));
}

export async function hideTopicFromBrowse(name: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = await fetchUser(auth.currentUser?.uid || "");
  if (!canModerate(resolveRole(user, auth.currentUser?.email))) {
    throw new Error("No permission");
  }
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Topic name required");

  const existing = await getFeedHiddenTopics();
  if (existing.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) return;

  const ref = doc(collection(getFirebaseDb(), COLLECTIONS.FEED_HIDDEN_TOPICS));
  await setDoc(ref, {
    name: trimmed,
    hiddenBy: auth.currentUser?.uid ?? null,
    hiddenAt: Timestamp.now(),
  });
}

export async function unhideTopicFromBrowse(id: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.FEED_HIDDEN_TOPICS, id));
}

function topicRoomName(room: ChatRoom): string {
  return room.topicName?.trim() || room.title?.trim() || room.id;
}

async function getPostCountByCategory(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  try {
    const postsSnap = await getDocs(
      query(collection(getFirebaseDb(), COLLECTIONS.POSTS), limit(500))
    );
    for (const d of postsSnap.docs) {
      const cat = (d.data() as DocumentData).category as string | undefined;
      const trimmed = cat?.trim();
      if (!trimmed) continue;
      counts.set(trimmed, (counts.get(trimmed) || 0) + 1);
    }
  } catch {
    // non-fatal — leaderboard still works from chat activity
  }
  return counts;
}

function sortLeaderboardEntries(
  entries: Omit<LeaderboardEntry, "rank">[],
  limit: number,
  compare: (a: Omit<LeaderboardEntry, "rank">, b: Omit<LeaderboardEntry, "rank">) => number
): LeaderboardEntry[] {
  return [...entries]
    .sort(compare)
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

async function buildTopicLeaderboardEntries(): Promise<Omit<LeaderboardEntry, "rank">[]> {
  const banned = new Set((await getBannedTopics()).map((t) => t.name.toLowerCase()));
  const feedHidden = new Set((await getFeedHiddenTopics()).map((t) => t.name.toLowerCase()));
  const postCounts = await getPostCountByCategory();

  let rooms: ChatRoom[] = [];
  try {
    rooms = await getChatRoomsForInbox();
  } catch {
    rooms = [];
  }

  return rooms
    .filter((room) => room.type === CHAT_TYPE_TOPIC)
    .filter((room) => {
      const key = topicRoomName(room).toLowerCase();
      return !banned.has(key) && !feedHidden.has(key);
    })
    .map((room) => {
      const name = topicRoomName(room);
      const messageCount = room.messageCount || 0;
      const postCount = postCounts.get(name) || 0;
      return {
        title: name,
        roomId: room.id,
        messageCount,
        postCount,
        score: messageCount * 2 + postCount,
        lastMessageAt: room.lastMessageAt,
        lastMessagePreview: room.lastMessagePreview || undefined,
        isTopic: true,
      };
    });
}

/** Matches Android: topic rooms + user's DMs, scored by chat activity. */
export async function getLeaderboardData(limit = 20): Promise<LeaderboardData> {
  const topicEntries = await buildTopicLeaderboardEntries();
  const topTopics = sortLeaderboardEntries(topicEntries, limit, (a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.lastMessageAt?.seconds ?? 0) - (a.lastMessageAt?.seconds ?? 0);
  });

  return { topTopics };
}

export async function getPopularTopicsForSearch(
  limit = SEARCH_POPULAR_TOPICS_LIMIT
): Promise<LeaderboardEntry[]> {
  const topicEntries = await buildTopicLeaderboardEntries();
  return sortLeaderboardEntries(topicEntries, limit, (a, b) => {
    if (b.postCount !== a.postCount) return b.postCount - a.postCount;
    if (b.messageCount !== a.messageCount) return b.messageCount - a.messageCount;
    return (b.lastMessageAt?.seconds ?? 0) - (a.lastMessageAt?.seconds ?? 0);
  });
}

export async function getPopularChatRoomsForSearch(
  limit = SEARCH_POPULAR_CHATS_LIMIT
): Promise<LeaderboardEntry[]> {
  const topicEntries = await buildTopicLeaderboardEntries();
  return sortLeaderboardEntries(topicEntries, limit, (a, b) => {
    if (b.messageCount !== a.messageCount) return b.messageCount - a.messageCount;
    if ((b.lastMessageAt?.seconds ?? 0) !== (a.lastMessageAt?.seconds ?? 0)) {
      return (b.lastMessageAt?.seconds ?? 0) - (a.lastMessageAt?.seconds ?? 0);
    }
    return b.postCount - a.postCount;
  });
}

function favoriteCategoriesRef(uid: string) {
  return collection(getFirebaseDb(), COLLECTIONS.USERS, uid, "favoriteCategories");
}

export async function getFavoriteCategories(targetUid?: string): Promise<FavoriteCategory[]> {
  const uid = targetUid || getFirebaseAuth().currentUser?.uid;
  if (!uid) return [];
  const snap = await getDocs(favoriteCategoriesRef(uid));
  return snap.docs
    .map((d) => {
      const data = d.data() as Omit<FavoriteCategory, "categoryId">;
      return { ...data, categoryId: d.id };
    })
    .sort((a, b) => (a.pinnedAt?.seconds ?? 0) - (b.pinnedAt?.seconds ?? 0));
}

export async function toggleFavoriteCategory(categoryId: string, name: string): Promise<boolean> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  const normalizedId = categoryId?.trim();
  const displayName = name?.trim();
  if (!normalizedId || !displayName) {
    throw new Error("Invalid topic name.");
  }
  const ref = doc(getFirebaseDb(), COLLECTIONS.USERS, uid, "favoriteCategories", normalizedId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await deleteDoc(ref);
    return false;
  }
  const current = await getFavoriteCategories(uid);
  if (current.length >= MAX_FAVORITE_CATEGORIES) {
    throw new Error(`You can pin up to ${MAX_FAVORITE_CATEGORIES} communities.`);
  }
  await setDoc(ref, {
    categoryId: normalizedId,
    name: displayName,
    pinnedAt: Timestamp.now(),
  });
  return true;
}
