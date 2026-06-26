import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  Timestamp,
  where,
  type DocumentReference,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import { emojiKey, isValidEmoji, normalizeEmoji, reactionDocId } from "@/lib/emoji";
import { mapFirestoreError } from "@/lib/utils";
import { bumpReactionPrefs } from "./reactionPrefsService";

export type ReactionTarget =
  | { type: "post"; postId: string }
  | { type: "comment"; commentId: string }
  | { type: "message"; roomId: string; messageId: string };

export type ReactionSummary = Record<string, number>;

function parentRef(target: ReactionTarget): DocumentReference {
  const db = getFirebaseDb();
  switch (target.type) {
    case "post":
      return doc(db, COLLECTIONS.POSTS, target.postId);
    case "comment":
      return doc(db, COLLECTIONS.COMMENTS, target.commentId);
    case "message":
      return doc(
        db,
        COLLECTIONS.CHAT_ROOMS,
        target.roomId,
        COLLECTIONS.MESSAGES,
        target.messageId
      );
  }
}

function reactionsCollection(target: ReactionTarget) {
  return collection(parentRef(target), "reactions");
}

function reactionRef(target: ReactionTarget, userId: string, emoji: string): DocumentReference {
  return doc(reactionsCollection(target), reactionDocId(userId, emoji));
}

function applySummaryDelta(
  summary: ReactionSummary,
  emoji: string,
  delta: 1 | -1
): ReactionSummary {
  const next = { ...summary };
  const count = (next[emoji] ?? 0) + delta;
  if (count <= 0) delete next[emoji];
  else next[emoji] = count;
  return next;
}

export async function toggleReaction(
  target: ReactionTarget,
  emojiInput: string
): Promise<{ added: boolean; emoji: string }> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");

  const emoji = normalizeEmoji(emojiInput);
  if (!isValidEmoji(emoji)) throw new Error("Invalid emoji");

  const parent = parentRef(target);
  const reaction = reactionRef(target, uid, emoji);
  const db = getFirebaseDb();

  try {
    const result = await runTransaction(db, async (tx) => {
      const [parentSnap, reactionSnap] = await Promise.all([tx.get(parent), tx.get(reaction)]);
      if (!parentSnap.exists()) throw new Error("Content not found");

      const summary = (parentSnap.data().reactionSummary as ReactionSummary) ?? {};

      if (reactionSnap.exists()) {
        tx.update(parent, { reactionSummary: applySummaryDelta(summary, emoji, -1) });
        tx.delete(reaction);
        return { added: false, emoji };
      }

      tx.set(reaction, {
        emoji,
        emojiKey: emojiKey(emoji),
        userId: uid,
        createdAt: Timestamp.now(),
      });
      tx.update(parent, { reactionSummary: applySummaryDelta(summary, emoji, 1) });
      return { added: true, emoji };
    });

    await bumpReactionPrefs(emoji);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update reaction";
    throw new Error(mapFirestoreError(message));
  }
}

export async function getMyReactions(target: ReactionTarget): Promise<Set<string>> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return new Set();

  const snap = await getDocs(
    query(reactionsCollection(target), where("userId", "==", uid))
  );
  return new Set(
    snap.docs
      .map((docSnap) => normalizeEmoji(String(docSnap.data().emoji ?? "")))
      .filter(Boolean)
  );
}

export function listenReactionSummary(
  target: ReactionTarget,
  onUpdate: (summary: ReactionSummary) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    parentRef(target),
    (snap) => {
      const summary = (snap.data()?.reactionSummary as ReactionSummary) ?? {};
      onUpdate(summary);
    },
    (err) => onError?.(new Error(mapFirestoreError(err.message)))
  );
}

export function listenMyReactions(
  target: ReactionTarget,
  onUpdate: (mine: Set<string>) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    onUpdate(new Set());
    return () => {};
  }

  return onSnapshot(
    query(reactionsCollection(target), where("userId", "==", uid)),
    (snap) => {
      onUpdate(
        new Set(
          snap.docs
            .map((docSnap) => normalizeEmoji(String(docSnap.data().emoji ?? "")))
            .filter(Boolean)
        )
      );
    },
    (err) => onError?.(new Error(mapFirestoreError(err.message)))
  );
}
