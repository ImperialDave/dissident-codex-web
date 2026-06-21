"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/UserAvatar";
import { getUsersForModeration } from "@/services/moderationService";
import { getOrCreateDmRoom } from "@/services/chatService";
import { useAuthStore } from "@/stores/authStore";
import type { User } from "@/models";

export default function NewMessagePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getUsersForModeration(150).then((list) =>
      setUsers(list.filter((u) => u.uid !== user?.uid))
    );
  }, [user?.uid]);

  const filtered = users.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">New Message</h1>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search users..."
        className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2"
      />
      <div className="space-y-2">
        {filtered.map((u) => (
          <button
            key={u.uid}
            onClick={async () => {
              const room = await getOrCreateDmRoom(u.uid);
              router.push(`/chat/${room.id}`);
            }}
            className="flex w-full items-center gap-3 rounded-xl border border-white/10 p-3 text-left hover:border-[var(--color-accent)]/40"
          >
            <UserAvatar name={u.displayName} photoUrl={u.photoUrl} />
            <div>
              <p className="font-medium">{u.displayName}</p>
              <p className="text-xs text-slate-400">{u.email}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}