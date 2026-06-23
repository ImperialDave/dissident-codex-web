"use client";

import { useEffect, useState } from "react";
import { ModEmpty, ModPageShell, ModRow, ModSection } from "@/components/ModPageShell";
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

  if (!isModerator()) {
    return <p className="codex-mod-alert">Moderator access required.</p>;
  }

  return (
    <ModPageShell
      tone="topics"
      title="Topic Moderation"
      subtitle="Ban topic names from new posts and lock chat rooms when discussions need a cooldown."
    >
      <ModSection
        title="Ban a topic"
        hint="Banned names cannot be used when creating new posts."
      >
        <div className="flex flex-wrap gap-2">
          <input
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            placeholder="Topic name to ban"
            className="codex-input min-w-[12rem] flex-1 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={async () => {
              await banTopic(topicName);
              setTopicName("");
              load();
            }}
            disabled={!topicName.trim()}
            className="codex-btn-danger rounded-lg px-4 py-2 text-sm disabled:opacity-50"
          >
            Ban topic
          </button>
        </div>
      </ModSection>

      <ModSection title="Banned Topics">
        {banned.length === 0 ? (
          <ModEmpty>No topics are currently banned.</ModEmpty>
        ) : (
          banned.map((b) => (
            <ModRow key={b.id}>
              <span className="font-medium">{b.name}</span>
              <button
                onClick={async () => {
                  await unbanTopic(b.id);
                  load();
                }}
                className="codex-btn-mod rounded-lg px-3 py-1 text-sm"
              >
                Unban
              </button>
            </ModRow>
          ))
        )}
      </ModSection>

      <ModSection
        title="Topic Rooms"
        hint="Locked rooms prevent new messages until a mod unlocks them."
      >
        {rooms.length === 0 ? (
          <ModEmpty>No topic chat rooms found.</ModEmpty>
        ) : (
          rooms.map((r) => (
            <ModRow key={r.id} highlight={r.locked ? "locked" : undefined}>
              <div className="min-w-0">
                <span className="font-medium">{r.title}</span>
                {r.locked && <span className="codex-mod-badge ml-2">Locked</span>}
              </div>
              <button
                onClick={async () => {
                  await lockTopicRoom(r.id, !r.locked);
                  load();
                }}
                className="codex-btn-mod shrink-0 rounded-lg px-3 py-1 text-sm"
              >
                {r.locked ? "Unlock" : "Lock"}
              </button>
            </ModRow>
          ))
        )}
      </ModSection>
    </ModPageShell>
  );
}