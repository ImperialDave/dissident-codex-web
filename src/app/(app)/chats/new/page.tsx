"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/UserAvatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { getUsersForModeration } from "@/services/moderationService";
import { mapFirestoreError, sanitizeUserError } from "@/lib/utils";
import { getBlockedUserIds } from "@/services/blockService";
import { getOrCreateDmRoom } from "@/services/chatService";
import { useAuthStore } from "@/stores/authStore";
import type { User } from "@/models";

export default function NewMessagePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busyUid, setBusyUid] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getUsersForModeration(150), getBlockedUserIds()]).then(([list, blockedIds]) =>
      setUsers(list.filter((u) => u.uid !== user?.uid && !blockedIds.has(u.uid)))
    );
  }, [user?.uid]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      (u.flair?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div>
      <PageHeader title="New message" backHref="/chats" />
      {error && (
        <p className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users"
        />
      </div>
      <div>
        {filtered.map((u) => (
          <button
            key={u.uid}
            onClick={async () => {
              setError("");
              setBusyUid(u.uid);
              try {
                const room = await getOrCreateDmRoom(u.uid);
                router.push(`/chat/${room.id}`);
              } catch (err) {
                setError(mapFirestoreError(sanitizeUserError(err, "Could not open chat")));
                setBusyUid(null);
              }
            }}
            disabled={busyUid === u.uid}
            className="codex-list-row flex w-full items-center gap-3 text-left disabled:opacity-50"
          >
            <UserAvatar name={u.displayName} photoUrl={u.photoUrl} userId={u.uid} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{u.displayName}</p>
              {u.flair && (
                <p className="truncate text-xs text-[var(--color-accent)]">{u.flair}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
