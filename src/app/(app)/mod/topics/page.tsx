"use client";

import { useEffect, useMemo, useState } from "react";
import { ModEmpty, ModPageShell, ModRow, ModSection } from "@/components/ModPageShell";
import {
  banTopic,
  getAllTopicNames,
  getBannedTopics,
  getFeedHiddenTopics,
  hideTopicFromBrowse,
  unbanTopic,
  unhideTopicFromBrowse,
} from "@/services/categoryService";
import { getTopicRooms, lockTopicRoom } from "@/services/chatService";
import { useAuthStore } from "@/stores/authStore";
import type { BannedTopic, ChatRoom, FeedHiddenTopic } from "@/models";
import { sanitizeUserError } from "@/lib/utils";

export default function ModTopicsPage() {
  const { isModerator } = useAuthStore();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [banned, setBanned] = useState<BannedTopic[]>([]);
  const [feedHidden, setFeedHidden] = useState<FeedHiddenTopic[]>([]);
  const [allTopics, setAllTopics] = useState<string[]>([]);
  const [topicName, setTopicName] = useState("");
  const [hideQuery, setHideQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const [roomList, bannedList, hiddenList, topics] = await Promise.all([
      getTopicRooms(),
      getBannedTopics(),
      getFeedHiddenTopics(),
      getAllTopicNames(),
    ]);
    setRooms(roomList);
    setBanned(bannedList);
    setFeedHidden(hiddenList);
    setAllTopics(topics);
  }

  useEffect(() => {
    if (isModerator()) {
      load().catch((err) =>
        setError(sanitizeUserError(err, "Failed to load topic data"))
      );
    }
  }, [isModerator]);

  const feedHiddenNames = useMemo(
    () => new Set(feedHidden.map((t) => t.name.toLowerCase())),
    [feedHidden]
  );

  const filteredTopics = useMemo(() => {
    const q = hideQuery.trim().toLowerCase();
    if (!q) return allTopics;
    return allTopics.filter((name) => name.toLowerCase().includes(q));
  }, [allTopics, hideQuery]);

  if (!isModerator()) {
    return <p className="codex-mod-alert">Moderator access required.</p>;
  }

  return (
    <ModPageShell
      tone="topics"
      title="Topic Moderation"
      subtitle="Ban topic names, hide topics from browse and feed chips, or lock chat rooms."
    >
      {error && <p className="codex-mod-alert">{error}</p>}

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
              try {
                setError("");
                await banTopic(topicName);
                setTopicName("");
                await load();
              } catch (err) {
                setError(sanitizeUserError(err, "Failed to ban topic"));
              }
            }}
            disabled={!topicName.trim()}
            className="codex-btn-danger rounded-lg px-4 py-2 text-sm disabled:opacity-50"
          >
            Ban topic
          </button>
        </div>
      </ModSection>

      <ModSection
        title="Hide from browse"
        hint="Hidden topics disappear from the feed chips, topics page, and leaderboard. Posts and chats still work."
        badge={
          feedHidden.length > 0 ? (
            <span className="codex-mod-badge">{feedHidden.length} hidden</span>
          ) : undefined
        }
      >
        <input
          value={hideQuery}
          onChange={(e) => setHideQuery(e.target.value)}
          placeholder="Search topics to hide…"
          className="codex-input mb-3 w-full rounded-lg px-3 py-2 text-sm"
        />
        {filteredTopics.length === 0 ? (
          <ModEmpty>No topics match your search.</ModEmpty>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {filteredTopics.map((name) => {
              const hidden = feedHiddenNames.has(name.toLowerCase());
              const hiddenDoc = feedHidden.find(
                (t) => t.name.toLowerCase() === name.toLowerCase()
              );
              return (
                <ModRow key={name} highlight={hidden ? "hidden" : undefined}>
                  <div className="min-w-0">
                    <span className="font-medium">{name}</span>
                    {hidden && <span className="codex-mod-badge ml-2">Hidden</span>}
                  </div>
                  <button
                    disabled={busy === name}
                    onClick={async () => {
                      setBusy(name);
                      setError("");
                      try {
                        if (hidden && hiddenDoc) {
                          await unhideTopicFromBrowse(hiddenDoc.id);
                        } else {
                          await hideTopicFromBrowse(name);
                        }
                        await load();
                      } catch (err) {
                        setError(sanitizeUserError(err, "Failed to update topic"));
                      } finally {
                        setBusy(null);
                      }
                    }}
                    className="codex-btn-mod shrink-0 rounded-lg px-3 py-1 text-sm disabled:opacity-50"
                  >
                    {busy === name ? "…" : hidden ? "Unhide" : "Hide"}
                  </button>
                </ModRow>
              );
            })}
          </div>
        )}
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
                  await load();
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
                  await load();
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