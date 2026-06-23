#!/usr/bin/env node
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

function loadEnv() {
  const raw = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const results = [];

function pass(name) {
  results.push({ name, ok: true });
  console.log(`✓ ${name}`);
}
function fail(name, err) {
  const msg = err?.message || String(err);
  results.push({ name, ok: false, error: msg });
  console.error(`✗ ${name}: ${msg}`);
}

async function runAuthenticatedChecks(label) {
  const uid = auth.currentUser.uid;
  const email = auth.currentUser.email || "";

  try {
    const postsSnap = await getDocs(
      query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(5))
    );
    pass(`${label}: read posts (${postsSnap.size})`);
  } catch (err) {
    fail(`${label}: read posts`, err);
  }

  try {
    const blockedSnap = await getDocs(collection(db, "users", uid, "blockedUsers"));
    pass(`${label}: read blockedUsers (${blockedSnap.size})`);
  } catch (err) {
    fail(`${label}: read blockedUsers`, err);
  }

  try {
    const feedHiddenSnap = await getDocs(collection(db, "feedHiddenTopics"));
    pass(`${label}: read feedHiddenTopics (${feedHiddenSnap.size})`);
  } catch (err) {
    fail(`${label}: read feedHiddenTopics`, err);
  }

  try {
    const hiddenSnap = await getDocs(collection(db, "hiddenTopics"));
    pass(`${label}: read hiddenTopics (${hiddenSnap.size})`);
  } catch (err) {
    fail(`${label}: read hiddenTopics`, err);
  }

  try {
    const postRef = doc(collection(db, "posts"));
    const now = Timestamp.now();
    await setDoc(postRef, {
      authorId: uid,
      authorName: "PermTest",
      authorRole: email.toLowerCase() === "ericdanielevans@gmail.com" ? "FOUNDER" : "USER",
      title: `Permission test ${Date.now()}`,
      body: "Automated smoke test — safe to delete.",
      category: "General",
      likeCount: 0,
      commentCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    pass(`${label}: create post`);
  } catch (err) {
    fail(`${label}: create post`, err);
  }
}

async function testFounderLogin() {
  const password = process.env.CODEX_TEST_PASSWORD || process.env.FOUNDER_PASSWORD;
  if (!password) {
    console.log("⊘ Skipping founder login (set CODEX_TEST_PASSWORD)");
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, "ericdanielevans@gmail.com", password);
    pass("Founder login");
    await runAuthenticatedChecks("founder");
    await signOut(auth);
  } catch (err) {
    fail("Founder login", err);
  }
}

async function testNewUser() {
  const email = `codex-perm-test-${Date.now()}@test.dissidentcodex.invalid`;
  const password = `Test_${Date.now()}_x9`;
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, email, password);
    pass("New user signup");
  } catch (err) {
    fail("New user signup", err);
    return;
  }
  try {
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      email,
      displayName: "PermTest",
      role: "USER",
      createdAt: Timestamp.now(),
      lastActive: Timestamp.now(),
    });
    pass("New user: create profile");
  } catch (err) {
    fail("New user: create profile", err);
  }
  await runAuthenticatedChecks("new user");
  try {
    await deleteUser(cred.user);
    pass("New user: cleanup");
  } catch {
    console.log("⊘ Could not delete test auth user");
  }
}

console.log("Codex permission smoke test\nProject:", firebaseConfig.projectId);
await testFounderLogin();
await testNewUser();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  const needsRules = failed.some((r) =>
    /blockedUsers|feedHiddenTopics/.test(r.name)
  );
  if (needsRules) {
    console.error(`
ACTION REQUIRED: Production Firestore rules are stale.
Paste ~/AndroidStudioProjects/Codex/firestore.rules into Firebase Console
→ dissidentcodex → Firestore → Rules → Publish.
Then search the editor for "feedHiddenTopics" and "blockedUsers".
`);
  }
  process.exit(1);
}
