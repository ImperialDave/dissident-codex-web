"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function createFirebase() {
  const app: FirebaseApp =
    getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);

  let appCheck: AppCheck | null = null;
  if (typeof window !== "undefined") {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
    const enableAppCheck = process.env.NEXT_PUBLIC_ENABLE_APP_CHECK === "true";
    // App Check is opt-in for web. A bad/missing token causes permission-denied when
    // enforcement is enabled in Firebase Console.
    if (enableAppCheck && siteKey) {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
  }

  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    storage: getStorage(app),
    functions: getFunctions(app),
    appCheck,
  };
}

let cached: ReturnType<typeof createFirebase> | null = null;

export function getFirebase() {
  if (!cached) cached = createFirebase();
  return cached;
}

export function getFirebaseAuth(): Auth {
  return getFirebase().auth;
}

export function getFirebaseDb(): Firestore {
  return getFirebase().db;
}

export function getFirebaseStorage(): FirebaseStorage {
  return getFirebase().storage;
}

export function getFirebaseFunctions(): Functions {
  return getFirebase().functions;
}
