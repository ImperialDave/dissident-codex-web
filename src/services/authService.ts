import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import {
  COLLECTIONS,
  FOUNDER_EMAIL,
  MAX_NAME,
} from "@/lib/constants";
import { isFounderEmail, resolveRole, sanitizeUserError, withResolvedRole } from "@/lib/utils";
import { roleFromString, type User } from "@/models";

export async function registerUser(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const name = displayName.trim();
  if (name.length > MAX_NAME) throw new Error(`Display name too long (max ${MAX_NAME})`);

  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const fbUser = cred.user;

  const isFounder = isFounderEmail(email);
  const user: User = {
    uid: fbUser.uid,
    email,
    displayName: name || email.split("@")[0] || "User",
    role: isFounder ? "FOUNDER" : "USER",
    createdAt: Timestamp.now(),
    lastActive: Timestamp.now(),
  };

  await setDoc(doc(db, COLLECTIONS.USERS, fbUser.uid), user);
  return withResolvedRole(user, email);
}

export async function loginUser(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return loadCurrentUserAndCheckBan(cred.user.uid, email);
}

export async function loadCurrentUserAndCheckBan(
  uid?: string,
  emailHint?: string | null
): Promise<User> {
  const auth = getFirebaseAuth();
  const fbUser = auth.currentUser;
  const resolvedUid = uid || fbUser?.uid;
  if (!resolvedUid) throw new Error("Not signed in");

  const email = emailHint ?? fbUser?.email ?? "";
  const user = await fetchUser(resolvedUid);

  if (!user) {
    const isFounder = isFounderEmail(email);
    const db = getFirebaseDb();
    const newUser: User = {
      uid: resolvedUid,
      email,
      displayName: email.split("@")[0] || "user",
      role: isFounder ? "FOUNDER" : "USER",
      createdAt: Timestamp.now(),
      lastActive: Timestamp.now(),
    };
    await setDoc(doc(db, COLLECTIONS.USERS, resolvedUid), newUser);
    return withResolvedRole(newUser, email);
  }

  if (roleFromString(user.role) === "BANNED") {
    await signOut(auth);
    throw new Error("Your account is banned.");
  }

  const finalUser = await ensureFounderRole(resolvedUid, user, email);
  await updateLastActive(resolvedUid);
  return finalUser;
}

export async function fetchUser(uid: string): Promise<User | null> {
  try {
    const db = getFirebaseDb();
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
    if (!snap.exists()) return null;
    const data = snap.data() as User;
    return withResolvedRole({ ...data, uid }, getFirebaseAuth().currentUser?.email);
  } catch {
    return null;
  }
}

/** Role string stored in Firestore — rules validate against this, not client-resolved role. */
export async function fetchFirestoreRole(uid: string): Promise<string> {
  try {
    const snap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.USERS, uid));
    const role = snap.data()?.role;
    return typeof role === "string" && role.trim() ? role.trim() : "USER";
  } catch {
    return "USER";
  }
}

async function ensureFounderRole(
  uid: string,
  user: User,
  emailHint?: string | null
): Promise<User> {
  const email = emailHint?.trim() || user.email;
  if (!isFounderEmail(email)) return user;

  let resolved = { ...user, role: "FOUNDER", email: email || user.email };
  if (roleFromString(user.role) === "FOUNDER") return resolved;

  const db = getFirebaseDb();
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), { role: "FOUNDER" });
  } catch {
    try {
      await setDoc(
        doc(db, COLLECTIONS.USERS, uid),
        { role: "FOUNDER", email },
        { merge: true }
      );
    } catch {
      // Client-side founder still works
    }
  }
  return resolved;
}

async function updateLastActive(uid: string): Promise<void> {
  try {
    await updateDoc(doc(getFirebaseDb(), COLLECTIONS.USERS, uid), {
      lastActive: Timestamp.now(),
    });
  } catch {
    // non-fatal
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const auth = getFirebaseAuth();
  const fbUser = auth.currentUser;
  if (!fbUser?.email) throw new Error("Not signed in with email.");

  const next = newPassword.trim();
  if (next.length < 6) throw new Error("New password must be at least 6 characters.");

  const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
  try {
    await reauthenticateWithCredential(fbUser, credential);
    await updatePassword(fbUser, next);
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
    if (code.includes("wrong-password") || code.includes("invalid-credential")) {
      throw new Error("Current password is incorrect.");
    }
    if (code.includes("requires-recent-login")) {
      throw new Error("Please log out and log back in, then try again.");
    }
    if (code.includes("weak-password")) {
      throw new Error("New password is too weak. Use at least 6 characters.");
    }
    throw new Error(sanitizeUserError(err, "Could not change password."));
  }
}

export async function logout(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export function getCurrentFirebaseUser(): FirebaseUser | null {
  return getFirebaseAuth().currentUser;
}

export async function syncFounderRole(): Promise<User> {
  const auth = getFirebaseAuth();
  const fb = auth.currentUser;
  if (!fb) throw new Error("Not signed in");
  if (!isFounderEmail(fb.email)) throw new Error("Not the founder account.");
  const user = await fetchUser(fb.uid);
  if (!user) throw new Error("Profile not found.");
  return ensureFounderRole(fb.uid, user, fb.email);
}
