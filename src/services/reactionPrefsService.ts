import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import { normalizeEmoji, resolveQuickEmojis } from "@/lib/emoji";

const PREFS_DOC = "reactionPrefs";

export interface ReactionPrefs {
  recentEmojis: string[];
  emojiUsageCounts: Record<string, number>;
  updatedAt?: Timestamp | null;
}

const memoryCache = new Map<string, ReactionPrefs>();

function emptyPrefs(): ReactionPrefs {
  return { recentEmojis: [], emojiUsageCounts: {} };
}

function prefsRef(uid: string) {
  return doc(getFirebaseDb(), COLLECTIONS.USERS, uid, "private", PREFS_DOC);
}

export async function loadReactionPrefs(): Promise<ReactionPrefs> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return emptyPrefs();

  const cached = memoryCache.get(uid);
  if (cached) return cached;

  const snap = await getDoc(prefsRef(uid));
  const prefs: ReactionPrefs = snap.exists()
    ? {
        recentEmojis: Array.isArray(snap.data().recentEmojis) ? snap.data().recentEmojis : [],
        emojiUsageCounts:
          snap.data().emojiUsageCounts && typeof snap.data().emojiUsageCounts === "object"
            ? snap.data().emojiUsageCounts
            : {},
        updatedAt: snap.data().updatedAt ?? null,
      }
    : emptyPrefs();

  memoryCache.set(uid, prefs);
  return prefs;
}

export function getCachedQuickEmojis(): string[] {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return resolveQuickEmojis([], {});
  const prefs = memoryCache.get(uid) ?? emptyPrefs();
  return resolveQuickEmojis(prefs.recentEmojis, prefs.emojiUsageCounts);
}

export async function bumpReactionPrefs(emoji: string): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return;

  const normalized = normalizeEmoji(emoji);
  if (!normalized) return;

  const current = memoryCache.get(uid) ?? (await loadReactionPrefs());
  const recentEmojis = [
    normalized,
    ...current.recentEmojis.filter((item) => item !== normalized),
  ].slice(0, 5);
  const emojiUsageCounts = {
    ...current.emojiUsageCounts,
    [normalized]: (current.emojiUsageCounts[normalized] ?? 0) + 1,
  };

  const next: ReactionPrefs = {
    recentEmojis,
    emojiUsageCounts,
    updatedAt: Timestamp.now(),
  };
  memoryCache.set(uid, next);

  await setDoc(prefsRef(uid), next, { merge: true });
}
