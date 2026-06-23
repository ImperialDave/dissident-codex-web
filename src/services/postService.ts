import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
  increment,
  deleteField,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS, MAX_BODY, MAX_TITLE } from "@/lib/constants";
import {
  mapFirestoreError,
  resolveMediaType,
  resolveRole,
  stripUndefinedFields,
  truncateAuthorName,
} from "@/lib/utils";
import { canModerate, canPost, type Post } from "@/models";
import { fetchFirestoreRole, fetchUser } from "./authService";
import { excludeBlockedAuthors, getBlockedUserIds } from "./blockService";

function toPost(id: string, data: DocumentData): Post {
  const imageUrl =
    (data.imageUrl as string | undefined) ||
    (data.imageURL as string | undefined) ||
    (data.mediaUrl as string | undefined) ||
    null;
  return {
    id,
    ...(data as Omit<Post, "id">),
    ...(imageUrl ? { imageUrl } : {}),
  };
}

export async function getPosts(
  category?: string | null,
  max = 50,
  options?: { includeHidden?: boolean }
): Promise<Post[]> {
  const db = getFirebaseDb();
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.POSTS), orderBy("createdAt", "desc"), limit(200))
  );
  let posts = snap.docs.map((d) => toPost(d.id, d.data()));
  if (!options?.includeHidden) {
    posts = posts.filter((p) => !p.hiddenFromFeed);
  }
  const effective =
    category && category !== "All" && category.trim() ? category : null;
  if (effective) posts = posts.filter((p) => p.category === effective);
  const blockedIds = await getBlockedUserIds();
  posts = excludeBlockedAuthors(posts, blockedIds);
  return posts.slice(0, max);
}

export async function getPost(postId: string): Promise<Post | null> {
  const snap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.POSTS, postId));
  if (!snap.exists()) return null;
  return toPost(snap.id, snap.data());
}

export async function createPost(
  title: string,
  body: string,
  category: string,
  imageUrl?: string | null,
  mediaType?: string | null
): Promise<Post> {
  const auth = getFirebaseAuth();
  const fbUser = auth.currentUser;
  if (!fbUser) throw new Error("Not logged in");

  let user = await fetchUser(fbUser.uid);
  if (!user) {
    // Recover orphaned auth accounts (profile doc missing).
    const { loadCurrentUserAndCheckBan } = await import("./authService");
    user = await loadCurrentUserAndCheckBan(fbUser.uid, fbUser.email);
  }

  const role = resolveRole(user, fbUser.email);
  if (!canPost(role)) throw new Error("You do not have permission to post.");

  const t = title.trim();
  const b = body.trim();
  const cat = category.trim();
  if (!t || !b) throw new Error("Title and body are required");
  if (t.length > MAX_TITLE) throw new Error(`Title too long (max ${MAX_TITLE})`);
  if (b.length > MAX_BODY) throw new Error(`Body too long (max ${MAX_BODY})`);
  if (!cat) throw new Error("Category is required");
  if (cat.length > 40) throw new Error("Category is too long (max 40 characters)");

  const db = getFirebaseDb();
  const postRef = doc(collection(db, COLLECTIONS.POSTS));
  const now = Timestamp.now();
  const authorRole = await fetchFirestoreRole(fbUser.uid);
  const resolvedMediaType = resolveMediaType(mediaType, imageUrl);
  const authorName = truncateAuthorName(
    user.displayName || fbUser.email?.split("@")[0] || "User"
  );
  const post: Post = {
    id: postRef.id,
    authorId: fbUser.uid,
    authorName,
    ...(user.photoUrl ? { authorPhotoUrl: user.photoUrl } : {}),
    authorRole,
    title: t,
    body: b,
    category: cat,
    likeCount: 0,
    commentCount: 0,
    createdAt: now,
    updatedAt: now,
    ...(imageUrl
      ? { imageUrl, mediaType: resolvedMediaType || "image" }
      : {}),
  };
  try {
    await setDoc(postRef, stripUndefinedFields(post as unknown as Record<string, unknown>) as Post);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create post";
    throw new Error(mapFirestoreError(message));
  }
  return post;
}

export async function togglePostFeedVisibility(postId: string): Promise<boolean> {
  const auth = getFirebaseAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not logged in");

  const user = await fetchUser(uid);
  const role = resolveRole(user, auth.currentUser?.email);
  if (!canModerate(role)) throw new Error("Moderator access required");

  const post = await getPost(postId);
  if (!post) throw new Error("Post not found");

  const nextHidden = !post.hiddenFromFeed;
  const db = getFirebaseDb();
  try {
    await updateDoc(doc(db, COLLECTIONS.POSTS, postId), {
      hiddenFromFeed: nextHidden,
      ...(nextHidden
        ? { hiddenBy: uid, hiddenAt: Timestamp.now() }
        : { hiddenBy: deleteField(), hiddenAt: deleteField() }),
      updatedAt: Timestamp.now(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update post visibility";
    throw new Error(mapFirestoreError(message));
  }
  return nextHidden;
}

export async function deletePost(postId: string): Promise<void> {
  const auth = getFirebaseAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not logged in");

  const post = await getPost(postId);
  if (!post) throw new Error("Post not found");

  const user = await fetchUser(uid);
  const role = resolveRole(user, auth.currentUser?.email);
  if (post.authorId !== uid && !canModerate(role)) {
    throw new Error("No permission to delete this post.");
  }
  await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.POSTS, postId));
}

export async function getPostsByUser(uid: string): Promise<Post[]> {
  const me = getFirebaseAuth().currentUser?.uid;
  if (me) {
    const blocked = await getBlockedUserIds();
    if (blocked.has(uid)) return [];
  }
  const snap = await getDocs(
    query(collection(getFirebaseDb(), COLLECTIONS.POSTS), where("authorId", "==", uid))
  );
  return snap.docs
    .map((d) => toPost(d.id, d.data()))
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
}

export async function searchPosts(q: string, max = 30): Promise<Post[]> {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return (await getPosts(null, 200)).filter(
    (p) =>
      p.title.toLowerCase().includes(needle) ||
      p.body.toLowerCase().includes(needle) ||
      p.authorName.toLowerCase().includes(needle) ||
      p.category.toLowerCase().includes(needle)
  ).slice(0, max);
}

const likedCache = new Map<string, Set<string>>();

export async function refreshLikedPostIds(): Promise<Set<string>> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return new Set();
  const snap = await getDocs(
    collection(getFirebaseDb(), COLLECTIONS.USERS, uid, "likedPosts")
  );
  const ids = new Set(snap.docs.map((d) => d.id));
  likedCache.set(uid, ids);
  return ids;
}

export async function hasLikedPost(postId: string): Promise<boolean> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return false;
  let cache = likedCache.get(uid);
  if (!cache) cache = await refreshLikedPostIds();
  return cache.has(postId);
}

export async function toggleLikePost(postId: string): Promise<boolean> {
  const liked = await hasLikedPost(postId);
  if (liked) {
    await unlikePost(postId);
    return false;
  }
  await likePost(postId);
  return true;
}

export async function likePost(postId: string): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  const db = getFirebaseDb();
  const likeRef = doc(db, COLLECTIONS.USERS, uid, "likedPosts", postId);
  const existing = await getDoc(likeRef);
  if (existing.exists()) throw new Error("You already liked this post.");

  // Rules allow only { likedAt } — doc id is the postId.
  await setDoc(likeRef, { likedAt: Timestamp.now() });
  try {
    await updateDoc(doc(db, COLLECTIONS.POSTS, postId), { likeCount: increment(1) });
  } catch (err) {
    await deleteDoc(likeRef).catch(() => {});
    const message = err instanceof Error ? err.message : "Failed to like post";
    throw new Error(mapFirestoreError(message));
  }
  const cache = likedCache.get(uid) || new Set();
  cache.add(postId);
  likedCache.set(uid, cache);
}

export async function unlikePost(postId: string): Promise<void> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  const db = getFirebaseDb();
  const likeRef = doc(db, COLLECTIONS.USERS, uid, "likedPosts", postId);
  const existing = await getDoc(likeRef);
  if (!existing.exists()) throw new Error("You have not liked this post.");

  // Decrement while likedPosts doc still exists (required by security rules).
  try {
    await updateDoc(doc(db, COLLECTIONS.POSTS, postId), { likeCount: increment(-1) });
    await deleteDoc(likeRef);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to unlike post";
    throw new Error(mapFirestoreError(message));
  }
  const cache = likedCache.get(uid);
  if (cache) cache.delete(postId);
}