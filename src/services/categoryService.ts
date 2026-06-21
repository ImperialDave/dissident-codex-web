import {
  collection,
  doc,
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
import { ALL_CATEGORY_LABEL, COLLECTIONS } from "@/lib/constants";
import { canModerate, type BannedTopic, type PostCategory } from "@/models";
import { fetchUser } from "./authService";
import { normalizeCategoryName, resolveRole } from "@/lib/utils";
import { getOrCreateTopicRoomByName } from "./chatService";

export async function getCategories(): Promise<PostCategory[]> {
  const snap = await getDocs(collection(getFirebaseDb(), COLLECTIONS.CATEGORIES));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PostCategory, "id">) }));
}

export async function getFeedCategoryNames(): Promise<string[]> {
  const hidden = new Set((await getBannedTopics()).map((t) => t.name.toLowerCase()));
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
  const visible = [...names]
    .filter((name) => !hidden.has(name.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
  return [ALL_CATEGORY_LABEL, ...visible];
}

export async function getCreateCategoryNames(): Promise<string[]> {
  const names = await getFeedCategoryNames();
  return names.filter((name) => name !== ALL_CATEGORY_LABEL);
}

export async function getBannedTopics(): Promise<BannedTopic[]> {
  const snap = await getDocs(collection(getFirebaseDb(), COLLECTIONS.HIDDEN_TOPICS));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BannedTopic, "id">) }));
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

  let hidden = new Set<string>();
  try {
    hidden = new Set((await getBannedTopics()).map((t) => t.name.toLowerCase()));
  } catch {
    // non-fatal
  }

  return [...names]
    .filter((name) => !hidden.has(name.toLowerCase()))
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
      return { id: docSnap.id, ...(docSnap.data() as Omit<PostCategory, "id">) };
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
    await getOrCreateTopicRoomByName(trimmed);
  } catch {
    // non-fatal
  }
  return category;
}

export async function resolveOrCreateCategory(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category is required");
  const existing = (await getCategories()).find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (existing) {
    try {
      await getOrCreateTopicRoomByName(existing.name);
    } catch {
      // non-fatal
    }
    return existing.name;
  }
  await createCategory(trimmed);
  return trimmed;
}

export async function banTopic(name: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = await fetchUser(auth.currentUser?.uid || "");
  if (!canModerate(resolveRole(user, auth.currentUser?.email))) {
    throw new Error("No permission");
  }
  const ref = doc(collection(getFirebaseDb(), COLLECTIONS.HIDDEN_TOPICS));
  await setDoc(ref, { name: name.trim(), bannedAt: Timestamp.now() });
}

export async function unbanTopic(id: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.HIDDEN_TOPICS, id));
}

export async function getLeaderboardData(max = 20) {
  const db = getFirebaseDb();
  const postsSnap = await getDocs(query(collection(db, COLLECTIONS.POSTS), limit(300)));
  const topicCounts = new Map<string, number>();
  for (const d of postsSnap.docs) {
    const cat = (d.data() as DocumentData).category as string;
    if (cat) topicCounts.set(cat, (topicCounts.get(cat) || 0) + 1);
  }
  const topTopics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([name, score], i) => ({ id: `topic-${i}`, name, score }));

  const roomsSnap = await getDocs(
    query(collection(db, COLLECTIONS.CHAT_ROOMS), limit(100))
  );
  const topChats = roomsSnap.docs
    .map((d) => {
      const data = d.data() as DocumentData;
      return {
        id: d.id,
        name: (data.title as string) || (data.topicName as string) || d.id,
        score: Number(data.messageCount) || 0,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, max);

  return { topTopics, topChats };
}
