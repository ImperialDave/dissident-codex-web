#!/usr/bin/env node
/**
 * Live diagnostic against production dissidentcodex Firestore.
 * Run: node scripts/diagnose-live.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  deleteUser,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  orderBy,
  limit,
  Timestamp,
  setDoc,
} from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .map((line) => line.match(/^([^#=]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1].trim(), m[2].trim()])
);

const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

async function probe(label, fn) {
  try {
    const result = await fn();
    console.log(`✓ ${label}:`, result);
    return { ok: true, result };
  } catch (err) {
    console.log(`✗ ${label}:`, err?.message || err);
    return { ok: false, error: err?.message };
  }
}

const email = `codex-diag-${Date.now()}@test.dissidentcodex.invalid`;
const password = `Diag_${Date.now()}_z9`;
const cred = await createUserWithEmailAndPassword(auth, email, password);
const uid = cred.user.uid;

await setDoc(doc(db, "users", uid), {
  uid,
  email,
  displayName: "Diag",
  role: "USER",
  createdAt: Timestamp.now(),
  lastActive: Timestamp.now(),
});

console.log("\n=== Production Firestore diagnostic ===");
console.log("Project:", env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log("Test uid:", uid, "\n");

const checks = {};

checks.users = await probe("users collection", async () => {
  const snap = await getDocs(query(collection(db, "users"), limit(5)));
  return `${snap.size} docs (sample)`;
});

checks.posts = await probe("posts collection", async () => {
  const snap = await getDocs(
    query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(10))
  );
  const rows = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id.slice(0, 8),
      title: (data.title || "").slice(0, 30),
      hiddenFromFeed: data.hiddenFromFeed === true,
      author: data.authorName,
    };
  });
  return `${snap.size} posts — ${JSON.stringify(rows)}`;
});

checks.hiddenTopics = await probe("hiddenTopics", async () => {
  const snap = await getDocs(collection(db, "hiddenTopics"));
  return `${snap.size} docs`;
});

checks.feedHiddenTopics = await probe("feedHiddenTopics", async () => {
  const snap = await getDocs(collection(db, "feedHiddenTopics"));
  return `${snap.size} docs`;
});

checks.blockedUsers = await probe("users/{uid}/blockedUsers", async () => {
  const snap = await getDocs(collection(db, "users", uid, "blockedUsers"));
  return `${snap.size} docs`;
});

checks.categories = await probe("categories", async () => {
  const snap = await getDocs(collection(db, "categories"));
  return `${snap.size} docs`;
});

checks.founder = await probe("founder profile (ericdanielevans@gmail.com)", async () => {
  const snap = await getDocs(query(collection(db, "users"), limit(50)));
  const founder = snap.docs.find(
    (d) => (d.data().email || "").toLowerCase() === "ericdanielevans@gmail.com"
  );
  if (!founder) {
    const all = await getDocs(query(collection(db, "users"), limit(200)));
    const f2 = all.docs.find(
      (d) => (d.data().email || "").toLowerCase() === "ericdanielevans@gmail.com"
    );
    if (!f2) return "NOT FOUND in first 200 users";
    return JSON.stringify({ uid: f2.id, ...f2.data() }, null, 0);
  }
  return JSON.stringify({ uid: founder.id, ...founder.data() }, null, 0);
});

console.log("\n=== Rules verdict ===");
if (!checks.feedHiddenTopics.ok && checks.hiddenTopics.ok) {
  console.log(
    "CONFIRMED: feedHiddenTopics rule block is MISSING from production."
  );
  console.log(
    "hiddenTopics uses identical read rule but works — only feedHiddenTopics match is absent."
  );
}
if (!checks.blockedUsers.ok) {
  console.log(
    "CONFIRMED: users/{userId}/blockedUsers subcollection rule is MISSING from production."
  );
}

try {
  await deleteUser(cred.user);
} catch {
  /* ignore */
}

const failed = Object.values(checks).filter((c) => !c.ok);
if (failed.length) {
  console.log(`\n${Object.keys(checks).length - failed.length}/${Object.keys(checks).length} checks passed`);
  process.exit(1);
}
console.log("\nAll checks passed.");
