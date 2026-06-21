"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { timeAgo } from "@/lib/utils";
import { getChatRoom, listenMessages, sendChatMessage, toggleFavoriteRoom } from "@/services/chatService";
import { useAuthStore } from "@/stores/authStore";
import type { ChatMessage, ChatRoom } from "@/models";

export default function ChatRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuthStore();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getChatRoom(roomId).then(setRoom);
    return listenMessages(roomId, setMessages, (e) => setError(e.message));
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await sendChatMessage(roomId, text);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border border-white/10 bg-[var(--color-surface)]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h1 className="font-semibold">{room?.title || "Chat"}</h1>
          {room?.locked && <p className="text-xs text-orange-300">This room is locked</p>}
        </div>
        <button
          onClick={() => toggleFavoriteRoom(roomId)}
          className="text-sm text-[var(--color-accent)]"
        >
          Toggle favorite
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg) => {
          const mine = msg.authorId === user?.uid;
          return (
            <div key={msg.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              <UserAvatar name={msg.authorName} photoUrl={msg.authorPhotoUrl} size="sm" />
              <div className={`max-w-[75%] rounded-xl px-3 py-2 ${mine ? "bg-[var(--color-accent)]/20" : "bg-black/30"}`}>
                <div className={`mb-1 flex items-center gap-2 ${mine ? "justify-end" : ""}`}>
                  <span className="text-xs font-medium">{msg.authorName}</span>
                  <RoleBadge role={msg.authorRole} />
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                <p className={`mt-1 text-[10px] text-slate-500 ${mine ? "text-right" : ""}`}>{timeAgo(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-white/10 p-4">
        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-[var(--color-accent)]"
          />
          <button type="submit" className="rounded-lg bg-[var(--color-accent)] px-4 py-2 font-semibold text-black">
            Send
          </button>
        </div>
      </form>
    </div>
  );
}