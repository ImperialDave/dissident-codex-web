"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/UserAvatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
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
    <div>
      <PageHeader title="New group" backHref="/chats" />
      <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm codex-text-muted">
        Create a private group for text and voice. Invite friends (up to 25 members).
      </p>

      {error && (
        <p className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Group name"
        />
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {friends.length === 0 ? (
          <p className="px-4 py-6 codex-text-muted">Add friends first to invite them to a group.</p>
        ) : (
          friends.map((f) => (
            <label
              key={f.uid}
              className="codex-list-row codex-list-row-interactive flex cursor-pointer items-center gap-3"
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

      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <Button
          type="button"
          variant="accent"
          className="w-full"
          onClick={handleCreate}
          disabled={busy || !title.trim() || selected.size === 0}
        >
          {busy ? "Creating..." : "Create group"}
        </Button>
      </div>
    </div>
  );
}