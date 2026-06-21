"use client";

import { useEffect, useState } from "react";
import { banTopic, getBannedTopics, unbanTopic } from "@/services/categoryService";
import { getTopicRooms, lockTopicRoom } from "@/services/chatService";
import { useAuthStore } from "@/stores/authStore";
import type { BannedTopic, ChatRoom } from "@/models";

export default function ModTopicsPage() {
  const { isModerator } = useAuthStore();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [banned, setBanned] = useState<BannedTopic[]>([]);
  const [topicName, setTopicName] = useState("");

  async function load() {
    setRooms(await getTopicRooms());
    setBanned(await getBannedTopics());
  }

  useEffect(() => {
    if (isModerator()) load();
  }, [isModerator]);

  if (!isModerator()) return <p className="text-red-400">Moderator access required.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Topic Moderation</h1>

      <div className="flex gap-2">
        <input
          value={topicName}
          onChange={(e) => setTopicName(e.target.value)}
          placeholder="Topic name to ban"
          className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
        />
        <button
          onClick={async () => { await banTopic(topicName); setTopicName(""); load(); }}
          className="rounded-lg bg-red-500/80 px-4 py-2 text-sm text-white"
        >
          Ban topic
        </button>
      </div>

      <section>
        <h2 className="mb-2 font-semibold">Banned Topics</h2>
        {banned.map((b) => (
          <div key={b.id} className="flex justify-between rounded-lg border border-white/10 p-3">
            <span>{b.name}</span>
            <button onClick={async () => { await unbanTopic(b.id); load(); }} className="text-sm text-[var(--color-accent)]">
              Unban
            </button>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Topic Rooms</h2>
        {rooms.map((r) => (
          <div key={r.id} className="mb-2 flex justify-between rounded-lg border border-white/10 p-3">
            <span>{r.title} {r.locked && "(locked)"}</span>
            <button
              onClick={async () => { await lockTopicRoom(r.id, !r.locked); load(); }}
              className="text-sm text-[var(--color-accent)]"
            >
              {r.locked ? "Unlock" : "Lock"}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}