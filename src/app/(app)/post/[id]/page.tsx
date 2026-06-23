"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChatMedia } from "@/components/ChatMedia";
import { GifPicker } from "@/components/GifPicker";
import { PostFeedVisibilityToggle } from "@/components/PostFeedVisibilityToggle";
import { PostMedia } from "@/components/PostMedia";
import { CategoryTag } from "@/components/CategoryTag";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { flattenComments } from "@/lib/commentThread";
import { mapFirestoreError, timeAgo } from "@/lib/utils";
import { addComment, deleteComment, getComments } from "@/services/commentService";
import { getBlockedUserIds } from "@/services/blockService";
import {
  deletePost,
  getPost,
  hasLikedPost,
  toggleLikePost,
  togglePostFeedVisibility,
} from "@/services/postService";
import {
  isImageFile,
  uploadCommentImage,
  uploadCommentVideo,
} from "@/services/mediaService";
import type { GifResult } from "@/services/giphyService";
import { useAuthStore } from "@/stores/authStore";
import type { Comment, Post } from "@/models";
import { canModerate } from "@/models";
import { resolveRole } from "@/lib/utils";

type PendingMedia =
  | { kind: "file"; file: File; previewUrl: string; mediaType: "image" | "gif" | "video" }
  | { kind: "remote"; url: string; mediaType: "gif" };

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, firebaseUser, isModerator } = useAuthStore();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [liked, setLiked] = useState(false);
  const [error, setError] = useState("");
  const [likeError, setLikeError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [p, c, l, blockedIds] = await Promise.all([
      getPost(id),
      getComments(id),
      hasLikedPost(id),
      getBlockedUserIds(),
    ]);
    if (p && blockedIds.has(p.authorId)) {
      router.replace("/feed");
      return;
    }
    setPost(p);
    setComments(c);
    setLiked(l);
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (pendingMedia?.kind === "file") {
        URL.revokeObjectURL(pendingMedia.previewUrl);
      }
    };
  }, [pendingMedia]);

  function clearPendingMedia() {
    if (pendingMedia?.kind === "file") {
      URL.revokeObjectURL(pendingMedia.previewUrl);
    }
    setPendingMedia(null);
  }

  function handleImagePick(file: File | undefined) {
    if (!file) return;
    if (!isImageFile(file)) {
      setError("Only images are allowed");
      return;
    }
    clearPendingMedia();
    setPendingMedia({
      kind: "file",
      file,
      previewUrl: URL.createObjectURL(file),
      mediaType: file.type === "image/gif" ? "gif" : "image",
    });
  }

  function handleVideoPick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("Only videos are allowed");
      return;
    }
    clearPendingMedia();
    setPendingMedia({
      kind: "file",
      file,
      previewUrl: URL.createObjectURL(file),
      mediaType: "video",
    });
  }

  function handleGifSelect(gif: GifResult) {
    clearPendingMedia();
    setPendingMedia({ kind: "remote", url: gif.fullUrl, mediaType: "gif" });
    setGifOpen(false);
  }

  async function handleComment(e: FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = text.trim();
    if (!trimmed && !pendingMedia) return;

    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      let mediaType: string | null = null;

      if (pendingMedia?.kind === "file") {
        if (pendingMedia.mediaType === "video") {
          imageUrl = await uploadCommentVideo(pendingMedia.file);
          mediaType = "video";
        } else {
          imageUrl = await uploadCommentImage(pendingMedia.file);
          mediaType = pendingMedia.mediaType;
        }
      } else if (pendingMedia?.kind === "remote") {
        imageUrl = pendingMedia.url;
        mediaType = pendingMedia.mediaType;
      }

      await addComment(id, trimmed, {
        imageUrl,
        mediaType,
        parentCommentId: replyTo?.id,
        replyToAuthorName: replyTo?.authorName,
      });
      setText("");
      setReplyTo(null);
      clearPendingMedia();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to comment");
    } finally {
      setSubmitting(false);
    }
  }

  if (!post) return <p className="text-slate-400">Loading post...</p>;

  const modView = isModerator();
  const canDelete =
    post.authorId === user?.uid ||
    modView ||
    canModerate(resolveRole(user, firebaseUser?.email));

  const canSubmit = Boolean(text.trim() || pendingMedia);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <article className="codex-surface rounded-xl p-6">
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
            <p className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>{timeAgo(post.createdAt)}</span>
              <span>·</span>
              <CategoryTag category={post.category} />
            </p>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-white">{post.title}</h1>
          {post.hiddenFromFeed && (
            <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-200">
              Hidden from feed
            </span>
          )}
        </div>
        <p className="whitespace-pre-wrap text-slate-200">{post.body}</p>
        <PostMedia
          url={post.imageUrl}
          mediaType={post.mediaType}
          alt={post.title}
          enlargeable
        />
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
            className={`rounded-lg px-4 py-2 text-sm ${liked ? "codex-chip-active" : "codex-btn-secondary"}`}
          >
            {liked ? "Liked" : "Like"} ({post.likeCount})
          </button>
          {likeError && <p className="text-sm text-red-400">{likeError}</p>}
          {modView && (
            <PostFeedVisibilityToggle
              hiddenFromFeed={post.hiddenFromFeed}
              disabled={visibilityLoading}
              onToggle={async () => {
                setVisibilityLoading(true);
                setError("");
                try {
                  const hidden = await togglePostFeedVisibility(id);
                  setPost((p) => p && { ...p, hiddenFromFeed: hidden });
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to update visibility");
                } finally {
                  setVisibilityLoading(false);
                }
              }}
            />
          )}
          {canDelete && (
            <button
              onClick={async () => {
                if (confirm("Delete this post?")) {
                  await deletePost(id);
                  window.location.href = "/feed";
                }
              }}
              className="codex-btn-danger rounded-lg px-4 py-2 text-sm"
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
            className="codex-surface rounded-lg p-4"
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
            {comment.imageUrl && (
              <ChatMedia
                url={comment.imageUrl}
                mediaType={comment.mediaType}
                className="mb-2"
                enlargeable
              />
            )}
            {comment.text?.trim() && (
              <p className="text-sm text-slate-200">{comment.text}</p>
            )}
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
          {pendingMedia && (
            <div className="codex-surface flex items-center gap-3 rounded-lg p-3">
              {pendingMedia.kind === "file" && pendingMedia.mediaType === "video" ? (
                <video
                  src={pendingMedia.previewUrl}
                  className="h-14 w-20 rounded-lg object-cover"
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={pendingMedia.kind === "file" ? pendingMedia.previewUrl : pendingMedia.url}
                  alt="Pending attachment"
                  className="h-14 w-20 rounded-lg object-cover"
                />
              )}
              <span className="flex-1 text-sm text-slate-400">
                {pendingMedia.kind === "remote" || pendingMedia.mediaType === "gif"
                  ? "GIF ready to post"
                  : pendingMedia.mediaType === "video"
                    ? "Video ready to post"
                    : "Image ready to post"}
              </span>
              <button
                type="button"
                onClick={clearPendingMedia}
                className="text-sm text-slate-400 hover:text-white"
              >
                Remove
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImagePick(e.target.files?.[0])}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleVideoPick(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={submitting}
              className="codex-btn-ghost rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Image
            </button>
            <button
              type="button"
              onClick={() => setGifOpen(true)}
              disabled={submitting}
              className="codex-btn-ghost rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
            >
              GIF
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={submitting}
              className="codex-btn-ghost rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Video
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment..."
            rows={3}
            className="codex-input w-full rounded-lg px-4 py-3"
          />
          {error && <p className="text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="codex-btn-accent rounded-lg px-4 py-2 text-sm disabled:opacity-50"
          >
            {submitting ? "Posting..." : "Post comment"}
          </button>
        </form>
      </section>

      <GifPicker open={gifOpen} onClose={() => setGifOpen(false)} onSelect={handleGifSelect} />
    </div>
  );
}
