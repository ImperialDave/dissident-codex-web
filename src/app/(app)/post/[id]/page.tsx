"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BiblePicker } from "@/components/bible/BiblePicker";
import { RichPostText } from "@/components/bible/RichPostText";
import { ChatMedia } from "@/components/ChatMedia";
import { GifPicker } from "@/components/GifPicker";
import { PostFeedVisibilityToggle } from "@/components/PostFeedVisibilityToggle";
import { PostMedia } from "@/components/PostMedia";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { insertTextAtCursor } from "@/lib/insertTextAtCursor";
import { flattenComments } from "@/lib/commentThread";
import { timeAgo } from "@/lib/utils";
import { addComment, deleteComment, getComments } from "@/services/commentService";
import { ReactionsBlock } from "@/components/ReactionsBlock";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  deletePost,
  getPost,
  togglePostFeedVisibility,
} from "@/services/postService";
import { resolveImageContentType } from "@/lib/imageUpload";
import { IMAGE_FILE_ACCEPT, VIDEO_FILE_ACCEPT } from "@/lib/mediaAccept";
import {
  isImageFile,
  isVideoFile,
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
  const { user, firebaseUser, isModerator } = useAuthStore();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [bibleOpen, setBibleOpen] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([getPost(id), getComments(id)]);
    setPost(p);
    setComments(c);
  }, [id]);

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
      mediaType: resolveImageContentType(file) === "image/gif" ? "gif" : "image",
    });
  }

  function handleVideoPick(file: File | undefined) {
    if (!file) return;
    if (!isVideoFile(file)) {
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
    <div>
      <PageHeader title="Post" backHref="/feed" />
      <article className="codex-timeline-row">
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
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-white">{post.title}</h1>
          {post.hiddenFromFeed && (
            <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-200">
              Hidden from feed
            </span>
          )}
        </div>
        <p className="whitespace-pre-wrap text-slate-200">
          <RichPostText text={post.body} />
        </p>
        <PostMedia
          url={post.imageUrl}
          mediaType={post.mediaType}
          alt={post.title}
          enlargeable
        />
        <ReactionsBlock
          target={{ type: "post", postId: id }}
          initialSummary={post.reactionSummary}
          className="mt-4"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
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
              className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300"
            >
              Delete
            </button>
          )}
        </div>
      </article>

      <section>
        <p className="border-b border-[var(--color-border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide codex-text-muted">
          Comments ({comments.length})
        </p>
        {flattenComments(comments).map(({ comment, depth }) => (
          <div
            key={comment.id}
            style={{ marginLeft: depth * 16 }}
            className="codex-list-row"
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
              <p className="whitespace-pre-wrap text-sm text-slate-200">
                <RichPostText text={comment.text} />
              </p>
            )}
            <ReactionsBlock
              target={{ type: "comment", commentId: comment.id }}
              initialSummary={comment.reactionSummary}
              compact
              className="mt-2"
            />
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

        <form onSubmit={handleComment} className="space-y-2 border-t border-[var(--color-border)] px-4 py-4">
          {replyTo && (
            <p className="text-sm text-slate-400">
              Replying to {replyTo.authorName}{" "}
              <button type="button" onClick={() => setReplyTo(null)} className="text-[var(--color-accent)]">
                cancel
              </button>
            </p>
          )}
          {pendingMedia && (
            <div className="flex items-center gap-3 border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
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
              accept={IMAGE_FILE_ACCEPT}
              className="hidden"
              onChange={(e) => handleImagePick(e.target.files?.[0])}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept={VIDEO_FILE_ACCEPT}
              className="hidden"
              onChange={(e) => handleVideoPick(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={submitting}
              className="codex-btn-secondary rounded-full px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Image
            </button>
            <button
              type="button"
              onClick={() => setGifOpen(true)}
              disabled={submitting}
              className="codex-btn-secondary rounded-full px-3 py-1.5 text-sm disabled:opacity-50"
            >
              GIF
            </button>
            <button
              type="button"
              onClick={() => setBibleOpen(true)}
              disabled={submitting}
              className="codex-btn-secondary rounded-full px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Bible
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={submitting}
              className="codex-btn-secondary rounded-full px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Video
            </button>
          </div>
          <textarea
            ref={commentRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment..."
            rows={3}
            className="codex-input w-full px-4 py-3"
          />
          {error && <p className="text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {submitting ? "Posting..." : "Post comment"}
          </button>
        </form>
      </section>

      <BiblePicker
        open={bibleOpen}
        onClose={() => setBibleOpen(false)}
        onInsert={(reference) => {
          const { value, cursor } = insertTextAtCursor(text, reference, commentRef.current);
          setText(value);
          requestAnimationFrame(() => {
            const el = commentRef.current;
            if (!el) return;
            el.focus();
            el.setSelectionRange(cursor, cursor);
          });
        }}
      />
      <GifPicker open={gifOpen} onClose={() => setGifOpen(false)} onSelect={handleGifSelect} />
    </div>
  );
}
