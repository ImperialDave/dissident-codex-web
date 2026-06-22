"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PostMedia } from "@/components/PostMedia";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { flattenComments } from "@/lib/commentThread";
import { mapFirestoreError, timeAgo } from "@/lib/utils";
import { addComment, deleteComment, getComments } from "@/services/commentService";
import { deletePost, getPost, hasLikedPost, toggleLikePost } from "@/services/postService";
import { useAuthStore } from "@/stores/authStore";
import type { Comment, Post } from "@/models";
import { canModerate } from "@/models";
import { resolveRole } from "@/lib/utils";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, firebaseUser, isModerator } = useAuthStore();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [liked, setLiked] = useState(false);
  const [error, setError] = useState("");
  const [likeError, setLikeError] = useState("");

  const load = useCallback(async () => {
    const [p, c, l] = await Promise.all([getPost(id), getComments(id), hasLikedPost(id)]);
    setPost(p);
    setComments(c);
    setLiked(l);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleComment(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await addComment(id, text, {
        parentCommentId: replyTo?.id,
        replyToAuthorName: replyTo?.authorName,
      });
      setText("");
      setReplyTo(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to comment");
    }
  }

  if (!post) return <p className="text-slate-400">Loading post...</p>;

  const canDelete =
    post.authorId === user?.uid ||
    isModerator() ||
    canModerate(resolveRole(user, firebaseUser?.email));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <article className="rounded-xl border border-white/10 bg-[var(--color-surface)] p-6">
        <div className="mb-4 flex items-center gap-3">
          <UserAvatar
            name={post.authorName}
            photoUrl={post.authorPhotoUrl}
            userId={post.authorId}
          />
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/user/${post.authorId}`}
                className="font-semibold hover:text-[var(--color-accent)]"
              >
                {post.authorName}
              </Link>
              <RoleBadge role={post.authorRole} />
            </div>
            <p className="text-xs text-slate-400">{timeAgo(post.createdAt)} · {post.category}</p>
          </div>
        </div>
        <h1 className="mb-3 text-2xl font-bold text-white">{post.title}</h1>
        <p className="whitespace-pre-wrap text-slate-200">{post.body}</p>
        <PostMedia url={post.imageUrl} mediaType={post.mediaType} alt={post.title} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={async () => {
              setLikeError("");
              try {
                const nowLiked = await toggleLikePost(id);
                setLiked(nowLiked);
                setPost((p) => p && { ...p, likeCount: p.likeCount + (nowLiked ? 1 : -1) });
              } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to update like";
                setLikeError(mapFirestoreError(message));
              }
            }}
            className={`rounded-lg px-4 py-2 text-sm ${liked ? "bg-[var(--color-accent)] text-black" : "border border-white/15"}`}
          >
            {liked ? "Liked" : "Like"} ({post.likeCount})
          </button>
          {likeError && <p className="text-sm text-red-400">{likeError}</p>}
          {canDelete && (
            <button
              onClick={async () => {
                if (confirm("Delete this post?")) {
                  await deletePost(id);
                  window.location.href = "/feed";
                }
              }}
              className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300"
            >
              Delete
            </button>
          )}
        </div>
      </article>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Comments ({comments.length})</h2>
        {flattenComments(comments).map(({ comment, depth }) => (
          <div
            key={comment.id}
            style={{ marginLeft: depth * 20 }}
            className="rounded-lg border border-white/10 bg-black/20 p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <UserAvatar
                name={comment.authorName}
                photoUrl={comment.authorPhotoUrl}
                size="sm"
                userId={comment.authorId}
              />
              <Link
                href={`/user/${comment.authorId}`}
                className="text-sm font-medium hover:text-[var(--color-accent)]"
              >
                {comment.authorName}
              </Link>
              <RoleBadge role={comment.authorRole} />
              <span className="text-xs text-slate-500">{timeAgo(comment.createdAt)}</span>
            </div>
            {comment.replyToAuthorName && (
              <p className="mb-1 text-xs text-[var(--color-accent)]">@{comment.replyToAuthorName}</p>
            )}
            <p className="text-sm text-slate-200">{comment.text}</p>
            <div className="mt-2 flex gap-3 text-xs">
              <button onClick={() => setReplyTo(comment)} className="text-[var(--color-accent)]">
                Reply
              </button>
              {(comment.authorId === user?.uid || isModerator()) && (
                <button
                  onClick={async () => {
                    await deleteComment(comment.id, id);
                    await load();
                  }}
                  className="text-red-400"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}

        <form onSubmit={handleComment} className="space-y-2">
          {replyTo && (
            <p className="text-sm text-slate-400">
              Replying to {replyTo.authorName}{" "}
              <button type="button" onClick={() => setReplyTo(null)} className="text-[var(--color-accent)]">
                cancel
              </button>
            </p>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment..."
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[var(--color-accent)]"
            required
          />
          {error && <p className="text-red-400">{error}</p>}
          <button type="submit" className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black">
            Post comment
          </button>
        </form>
      </section>
    </div>
  );
}