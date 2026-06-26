"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ChatMedia } from "@/components/ChatMedia";
import { GifPicker } from "@/components/GifPicker";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { timeAgo } from "@/lib/utils";
import { ChatRoomTitle } from "@/components/ChatRoomTitle";
import { FavoriteStar } from "@/components/FavoriteStar";
import { VoiceChatControls } from "@/components/VoiceChatControls";
import {
  getChatRoom,
  getFavoriteRoomIds,
  listenMessages,
  sendChatMessage,
  toggleFavoriteRoom,
} from "@/services/chatService";
import { isImageFile, uploadChatImage, uploadChatVideo } from "@/services/mediaService";
import type { GifResult } from "@/services/giphyService";
import { useAuthStore } from "@/stores/authStore";
import type { ChatMessage, ChatRoom } from "@/models";

type PendingMedia =
  | { kind: "file"; file: File; previewUrl: string; mediaType: "image" | "gif" | "video" }
  | { kind: "remote"; url: string; mediaType: "gif" };

export default function ChatRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuthStore();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getChatRoom(roomId).then(setRoom);
    return listenMessages(roomId, setMessages, (e) => setError(e.message));
  }, [roomId]);

  useEffect(() => {
    getFavoriteRoomIds().then((ids) => setFavorited(ids.has(roomId)));
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = text.trim();
    if (!trimmed && !pendingMedia) return;

    setSending(true);
    try {
      let imageUrl: string | null = null;
      let mediaType: string | null = null;

      if (pendingMedia?.kind === "file") {
        if (pendingMedia.mediaType === "video") {
          imageUrl = await uploadChatVideo(pendingMedia.file);
          mediaType = "video";
        } else {
          imageUrl = await uploadChatImage(pendingMedia.file);
          mediaType = pendingMedia.mediaType;
        }
      } else if (pendingMedia?.kind === "remote") {
        imageUrl = pendingMedia.url;
        mediaType = pendingMedia.mediaType;
      }

      await sendChatMessage(roomId, trimmed, { imageUrl, mediaType });
      setText("");
      clearPendingMedia();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  const canSend = Boolean(text.trim() || pendingMedia);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border border-white/10 bg-[var(--color-surface)]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h1 className="font-semibold">
            <ChatRoomTitle room={room} myUid={user?.uid} />
          </h1>
          {room?.locked && <p className="text-xs text-orange-300">This room is locked</p>}
        </div>
        <FavoriteStar
          favorited={favorited}
          disabled={favoriteLoading}
          onToggle={async () => {
            setFavoriteLoading(true);
            try {
              setFavorited(await toggleFavoriteRoom(roomId));
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to update favorite");
            } finally {
              setFavoriteLoading(false);
            }
          }}
        />
      </div>

      <VoiceChatControls
        room={room}
        roomId={roomId}
        displayName={user?.displayName || "User"}
        myUid={user?.uid}
      />

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg) => {
          const mine = msg.authorId === user?.uid;
          return (
            <div key={msg.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              <UserAvatar
                name={msg.authorName}
                photoUrl={msg.authorPhotoUrl}
                size="sm"
                userId={msg.authorId}
              />
              <div className={`max-w-[75%] rounded-xl px-3 py-2 ${mine ? "bg-[var(--color-accent)]/20" : "bg-black/30"}`}>
                <div className={`mb-1 flex items-center gap-2 ${mine ? "justify-end" : ""}`}>
                  <a
                    href={`/user/${msg.authorId}`}
                    className="text-xs font-medium hover:text-[var(--color-accent)]"
                  >
                    {msg.authorName}
                  </a>
                  <RoleBadge role={msg.authorRole} />
                </div>
                {msg.imageUrl && (
                  <ChatMedia
                    url={msg.imageUrl}
                    mediaType={msg.mediaType}
                    className="mb-2"
                    enlargeable
                  />
                )}
                {msg.text?.trim() && (
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                )}
                <p className={`mt-1 text-[10px] text-slate-500 ${mine ? "text-right" : ""}`}>{timeAgo(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {pendingMedia && (
        <div className="flex items-center gap-3 border-t border-white/10 px-4 py-2">
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
              ? "GIF ready to send"
              : pendingMedia.mediaType === "video"
                ? "Video ready to send"
                : "Image ready to send"}
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

      <form onSubmit={handleSend} className="border-t border-white/10 p-4">
        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
        <div className="mb-2 flex gap-2">
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
            disabled={sending || Boolean(room?.locked)}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            Image
          </button>
          <button
            type="button"
            onClick={() => setGifOpen(true)}
            disabled={sending || Boolean(room?.locked)}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            GIF
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={sending || Boolean(room?.locked)}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            Video
          </button>
        </div>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 rounded-lg border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !canSend || Boolean(room?.locked)}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 font-semibold text-black disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>

      <GifPicker open={gifOpen} onClose={() => setGifOpen(false)} onSelect={handleGifSelect} />
    </div>
  );
}
