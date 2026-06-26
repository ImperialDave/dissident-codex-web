#!/usr/bin/env node
/**
 * One-time migration: users/{uid}/likedPosts/{postId} -> posts/{postId}/reactions/{uid}_heart + reactionSummary
 * Run: node scripts/migrate-likes-to-reactions.mjs
 * Requires Firebase Admin credentials via GOOGLE_APPLICATION_CREDENTIALS or gcloud auth.
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const HEART = "❤️";

function emojiKey(emoji) {
  return Array.from(new TextEncoder().encode(emoji))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function migrate() {
  const usersSnap = await db.collection("users").get();
  let migrated = 0;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const likesSnap = await db.collection("users").doc(uid).collection("likedPosts").get();
    for (const likeDoc of likesSnap.docs) {
      const postId = likeDoc.id;
      const postRef = db.collection("posts").doc(postId);
      const reactionId = `${uid}_${emojiKey(HEART)}`;

      const existing = await postRef.collection("reactions").doc(reactionId).get();
      if (existing.exists) continue;

      await db.runTransaction(async (tx) => {
        const postSnap = await tx.get(postRef);
        if (!postSnap.exists) return;
        const summary = postSnap.data().reactionSummary || {};
        tx.set(postRef.collection("reactions").doc(reactionId), {
          emoji: HEART,
          emojiKey: emojiKey(HEART),
          userId: uid,
          createdAt: FieldValue.serverTimestamp(),
        });
        tx.update(postRef, {
          [`reactionSummary.${HEART}`]: (summary[HEART] || 0) + 1,
        });
      });
      migrated += 1;
    }
  }

  console.log(`Migrated ${migrated} likes to heart reactions.`);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});