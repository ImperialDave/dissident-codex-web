#!/usr/bin/env node
/**
 * Browser smoke test: signup on discodex.net and verify feed shows posts.
 * Run: node scripts/browser-feed-test.mjs
 */
import { chromium } from "playwright";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";

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

const email = `codex-browser-${Date.now()}@test.dissidentcodex.invalid`;
const password = `Browser_${Date.now()}_x9`;
const cred = await createUserWithEmailAndPassword(auth, email, password);
await setDoc(doc(db, "users", cred.user.uid), {
  uid: cred.user.uid,
  email,
  displayName: "BrowserTest",
  role: "USER",
  createdAt: Timestamp.now(),
  lastActive: Timestamp.now(),
});

const base = process.env.CODEX_BASE_URL || "https://discodex.net";
const consoleErrors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

try {
  await page.goto(`${base}/login`, { waitUntil: "networkidle", timeout: 60000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(feed|home)?/, { timeout: 30000 }).catch(() => {});
  await page.goto(`${base}/feed`, { waitUntil: "networkidle", timeout: 60000 });

  const body = await page.textContent("body");
  const hasPermissionError =
    body?.includes("permission") || body?.includes("Permission");
  const hasPosts =
    body?.includes("Blah") ||
    body?.includes("Test") ||
    body?.includes("Francis") ||
    body?.includes("Permission test");
  const hasEmptyState = body?.includes("No posts yet");

  console.log("URL:", page.url());
  console.log("Has post content:", hasPosts);
  console.log("Shows empty state:", hasEmptyState);
  console.log("Visible permission error:", hasPermissionError);
  if (consoleErrors.length) {
    console.log("Console errors:");
    for (const e of consoleErrors.slice(0, 10)) console.log(" ", e);
  }

  if (!hasPosts || hasPermissionError) {
    process.exit(1);
  }
  console.log("Browser feed test PASSED");
} finally {
  await browser.close();
  try {
    await deleteUser(cred.user);
  } catch {
    /* ignore */
  }
}
