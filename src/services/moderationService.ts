import {
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  limit,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, getFirebaseFunctions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { COLLECTIONS } from "@/lib/constants";
import { isFounderEmail, mapCallableError, resolveRole, withResolvedRole } from "@/lib/utils";
import { canModerate, roleFromString, type RoleName, type User } from "@/models";
import { fetchUser } from "./authService";

export interface ModerationStats {
  total: number;
  members: number;
  mods: number;
  admins: number;
  founders: number;
  suspended: number;
  banned: number;
}

export async function getUsersForModeration(max = 300): Promise<User[]> {
  const snap = await getDocs(query(collection(getFirebaseDb(), COLLECTIONS.USERS), limit(max)));
  return snap.docs
    .map((d) => withResolvedRole({ uid: d.id, ...(d.data() as Omit<User, "uid">) }))
    .sort((a, b) => (b.lastActive?.seconds ?? b.createdAt?.seconds ?? 0) - (a.lastActive?.seconds ?? a.createdAt?.seconds ?? 0));
}

export function computeModerationStats(users: User[]): ModerationStats {
  const stats: ModerationStats = {
    total: users.length,
    members: 0,
    mods: 0,
    admins: 0,
    founders: 0,
    suspended: 0,
    banned: 0,
  };
  for (const u of users) {
    switch (roleFromString(u.role)) {
      case "USER":
        stats.members++;
        break;
      case "MOD":
        stats.mods++;
        break;
      case "ADMIN":
        stats.admins++;
        break;
      case "FOUNDER":
        stats.founders++;
        break;
      case "SUSPENDED":
        stats.suspended++;
        break;
      case "BANNED":
        stats.banned++;
        break;
    }
  }
  return stats;
}

export async function updateUserRole(targetUid: string, newRole: RoleName): Promise<void> {
  const auth = getFirebaseAuth();
  const actor = await fetchUser(auth.currentUser?.uid || "");
  const actorRole = resolveRole(actor, auth.currentUser?.email);
  const isFounder = isFounderEmail(auth.currentUser?.email) || actorRole === "FOUNDER";

  if (!canModerate(actorRole) && !isFounder) {
    throw new Error("Insufficient permissions.");
  }

  const target = await fetchUser(targetUid);
  if (target && isFounderEmail(target.email) && newRole !== "FOUNDER") {
    throw new Error("The founder account cannot be demoted.");
  }
  if (newRole === "FOUNDER" && !isFounder) {
    throw new Error("Only the founder can assign the Founder role.");
  }
  if (newRole === "ADMIN" && actorRole !== "ADMIN" && !isFounder) {
    throw new Error("Only admins can promote other admins.");
  }

  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.USERS, targetUid), { role: newRole });
}

export interface DeleteUserAccountResult {
  deletedUid: string;
  anonymizedPosts: number;
  anonymizedComments: number;
}

export async function deleteUserAccount(targetUid: string): Promise<DeleteUserAccountResult> {
  const auth = getFirebaseAuth();
  const callerUid = auth.currentUser?.uid;
  if (!callerUid) throw new Error("Not logged in");

  const actor = await fetchUser(callerUid);
  const isFounder =
    isFounderEmail(auth.currentUser?.email) || resolveRole(actor, auth.currentUser?.email) === "FOUNDER";
  if (!isFounder) throw new Error("Founder access required.");

  if (targetUid === callerUid) {
    throw new Error("You cannot delete your own account here.");
  }

  const target = await fetchUser(targetUid);
  if (target && isFounderEmail(target.email)) {
    throw new Error("The founder account cannot be deleted.");
  }

  try {
    const fn = httpsCallable<{ targetUid: string }, DeleteUserAccountResult>(
      getFirebaseFunctions(),
      "deleteUserAccount"
    );
    const result = await fn({ targetUid });
    return result.data;
  } catch (err) {
    throw new Error(mapCallableError(err));
  }
}

export async function getRecentComments(max = 40) {
  const snap = await getDocs(query(collection(getFirebaseDb(), COLLECTIONS.COMMENTS), limit(max)));
  return snap.docs
    .map((d) => {
      const data = d.data() as { createdAt?: { seconds?: number } };
      return { id: d.id, ...data };
    })
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
}
