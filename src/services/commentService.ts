import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  increment,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS, MAX_COMMENT } from "@/lib/constants";
import { canModerate, type Comment } from "@/models";
import { fetchFirestoreRole, fetchUser } from "./authService";
import { mapFirestoreError, resolveRole, stripUndefinedFields } from "@/lib/utils";

export async function getComments(postId: string): Promise<Comment[]> {
  const snap = await getDocs(
    query(collection(getFirebaseDb(), COLLECTIONS.COMMENTS), where("postId", "==", postId))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Comment, "id">) }))
    .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
}

export async function addComment(
  postId: string,
  text: string,
  options?: {
    imageUrl?: string | null;
    mediaType?: string | null;
    parentCommentId?: string | null;
    replyToAuthorName?: string | null;
  }
): Promise<Comment> {
  const auth = getFirebaseAuth();
  const fbUser = auth.currentUser;
  if (!fbUser) throw new Error("Not logged in");

  let user = await fetchUser(fbUser.uid);
  if (!user) {
    const { loadCurrentUserAndCheckBan } = await import("./authService");
    user = await loadCurrentUserAndCheckBan(fbUser.uid, fbUser.email);
  }

  if (!["FOUNDER", "ADMIN", "MOD", "USER"].includes(resolveRole(user, fbUser.email))) {
    throw new Error("You cannot comment at this time.");
  }

  const t = text.trim();
  if (!t && !options?.imageUrl) throw new Error("Comment cannot be empty");
  if (t.length > MAX_COMMENT) throw new Error(`Comment too long (max ${MAX_COMMENT})`);

  const db = getFirebaseDb();
  const ref = doc(collection(db, COLLECTIONS.COMMENTS));
  const authorRole = await fetchFirestoreRole(fbUser.uid);
  const comment: Comment = {
    id: ref.id,
    postId,
    authorId: fbUser.uid,
    authorName: user.displayName,
    ...(user.photoUrl ? { authorPhotoUrl: user.photoUrl } : {}),
    authorRole,
    text: t,
    likeCount: 0,
    createdAt: Timestamp.now(),
    ...(options?.parentCommentId ? { parentCommentId: options.parentCommentId } : {}),
    ...(options?.replyToAuthorName ? { replyToAuthorName: options.replyToAuthorName } : {}),
    ...(options?.imageUrl ? { imageUrl: options.imageUrl, mediaType: options.mediaType || "image" } : {}),
  };
  try {
    await setDoc(ref, stripUndefinedFields(comment as unknown as Record<string, unknown>));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add comment";
    throw new Error(mapFirestoreError(message));
  }
  try {
    await updateDoc(doc(db, COLLECTIONS.POSTS, postId), { commentCount: increment(1) });
  } catch {
    // comment saved
  }
  return comment;
}

export async function deleteComment(commentId: string, postId: string): Promise<void> {
  const auth = getFirebaseAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not logged in");

  const snap = await getDocs(
    query(
      collection(getFirebaseDb(), COLLECTIONS.COMMENTS),
      where("postId", "==", postId)
    )
  );
  const comment = snap.docs.find((d) => d.id === commentId);
  if (!comment) throw new Error("Comment not found");

  const data = comment.data() as Comment;
  const user = await fetchUser(uid);
  const role = resolveRole(user, auth.currentUser?.email);
  if (data.authorId !== uid && !canModerate(role)) {
    throw new Error("No permission to delete this comment.");
  }
  await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.COMMENTS, commentId));
}
