"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/UserAvatar";
import { getBlockedUsers, unblockUser } from "@/services/blockService";
import { mapFirestoreError } from "@/lib/utils";
import type { BlockedUser } from "@/models";

export function BlockedUsersSection() {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBlocked(await getBlockedUsers());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUnblock(uid: string) {
    setError("");
    setBusyUid(uid);
    try {
      await unblockUser(uid);
      setBlocked((prev) => prev.filter((user) => user.uid !== uid));
    } catch (err) {
      setError(err instanceof Error ? mapFirestoreError(err.message) : "Could not unblock user");
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <div id="blocked-users" className="codex-settings-section scroll-mt-20">
      <h2 className="mb-1 font-semibold">Blocked users</h2>
      <p className="mb-4 text-xs codex-text-muted">
        People you block cannot message you and their posts are hidden from your feed.
      </p>
      {error && <p className="mb-3 text-sm text-red-300">{error}</p>}
      {loading ? (
        <p className="text-sm codex-text-muted">Loading blocked users...</p>
      ) : blocked.length === 0 ? (
        <p className="text-sm codex-text-muted">You have not blocked anyone.</p>
      ) : (
        <div className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] overflow-hidden">
          {blocked.map((user) => (
            <div
              key={user.uid}
              className="flex items-center justify-between gap-3 bg-[var(--color-surface)] px-4 py-3"
            >
              <Link href={`/user/${user.uid}`} className="flex min-w-0 flex-1 items-center gap-3">
                <UserAvatar name={user.displayName} size="sm" />
                <span className="truncate font-medium">{user.displayName}</span>
              </Link>
              <button
                type="button"
                onClick={() => void handleUnblock(user.uid)}
                disabled={busyUid === user.uid}
                className="codex-btn-ghost shrink-0 rounded-full px-3 py-1.5 text-sm disabled:opacity-50"
              >
                {busyUid === user.uid ? "Unblocking..." : "Unblock"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}