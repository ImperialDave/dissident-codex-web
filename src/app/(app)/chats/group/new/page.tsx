"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserAvatar } from "@/components/UserAvatar";
import { createGroupRoom } from "@/services/chatService";
import { getFriends } from "@/services/friendService";
import { mapFirestoreError } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import type { Friend } from "@/models";

export default function NewGroupPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getFriends().then(setFriends);
  }, [user?.uid]);

  function toggleFriend(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  async function handleCreate() {
    setError("");
    setBusy(true);
    try {
      const room = await createGroupRoom(title, [...selected]);
      router.push(`/chat/${room.id}`);
    } catch (err) {
      setError(mapFirestoreError(err instanceof Error ? err.message : "Could not create group"));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New group</h1>
        <Link href="/chats" className="text-sm text-[var(--color-accent)]">
          Back
        </Link>
      </div>
      <p className="text-sm text-slate-400">
        Create a private group for text and voice. Invite friends (up to 25 members).
      </p>
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Group name"
        className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2"
      />
      <div className="space-y-2">
        {friends.length === 0 ? (
          <p className="text-slate-400">Add friends first to invite them to a group.</p>
        ) : (
          friends.map((f) => (
            <label
              key={f.uid}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 p-3 hover:border-[var(--color-accent)]/40"
            >
              <input
                type="checkbox"
                checked={selected.has(f.uid)}
                onChange={() => toggleFriend(f.uid)}
                className="accent-[var(--color-accent)]"
              />
              <UserAvatar name={f.displayName} photoUrl={f.photoUrl} size="sm" />
              <span>{f.displayName}</span>
            </label>
          ))
        )}
      </div>
      <button
        type="button"
        onClick={handleCreate}
        disabled={busy || !title.trim() || selected.size === 0}
        className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2 font-semibold text-black disabled:opacity-50"
      >
        {busy ? "Creating..." : "Create group"}
      </button>
    </div>
  );
}
