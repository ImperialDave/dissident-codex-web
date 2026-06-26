"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { ModerationMenu } from "@/components/ModerationMenu";
import { ModEmpty, ModPageShell, ModRow, ModSection, ModStatGrid } from "@/components/ModPageShell";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { isFounderEmail } from "@/lib/utils";
import { syncFounderRole } from "@/services/authService";
import { computeModerationStats, getUsersForModeration } from "@/services/moderationService";
import { useAuthStore } from "@/stores/authStore";
import type { User } from "@/models";

export default function FounderToolsPage() {
  const { isFounder, refreshUser } = useAuthStore();
  const [stats, setStats] = useState<ReturnType<typeof computeModerationStats> | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [deleteError, setDeleteError] = useState("");

  async function loadUsers() {
    const data = await getUsersForModeration(500);
    setUsers(data);
    setStats(computeModerationStats(data));
  }

  useEffect(() => {
    if (!isFounder()) return;
    loadUsers().catch((err) =>
      setDeleteError(err instanceof Error ? err.message : "Failed to load users")
    );
  }, [isFounder]);

  const deletableUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return users
      .filter((u) => !isFounderEmail(u.email))
      .filter(
        (u) =>
          !q ||
          u.displayName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.flair?.toLowerCase().includes(q) ?? false)
      );
  }, [users, userQuery]);

  if (!isFounder()) {
    return <p className="codex-mod-alert">Founder access only.</p>;
  }

  async function handleSync() {
    setSyncing(true);
    setMessage("");
    try {
      await syncFounderRole();
      await refreshUser();
      setMessage("Founder role synced to Firestore.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <ModPageShell
      tone="founder"
      title="Founder Tools"
      subtitle="Full permissions across Codex — posts, comments, chats, moderation, and chess."
    >
      {stats && (
        <ModStatGrid
          items={[
            { label: "Users", value: stats.total },
            { label: "Mods", value: stats.mods },
            { label: "Admins", value: stats.admins },
            { label: "Banned", value: stats.banned, tone: "warn" },
          ]}
        />
      )}

      <ModSection title="Quick links" hint="Jump to moderation areas across the site.">
        <ModerationMenu variant="cards" />
      </ModSection>

      <ModSection
        title="Delete Account"
        hint={'Permanently remove a user from Auth and Codex. Their posts and comments become "Deleted user".'}
        badge={
          <input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Search users…"
            className="codex-input w-full min-w-[12rem] rounded-lg px-3 py-2 text-sm sm:w-52"
          />
        }
      >
        {deleteError && <p className="mb-3 text-sm text-red-300">{deleteError}</p>}
        <div className="max-h-96 overflow-y-auto">
          {deletableUsers.length === 0 ? (
            <ModEmpty>No deletable users match your search.</ModEmpty>
          ) : (
            deletableUsers.map((u) => (
              <ModRow key={u.uid}>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <UserAvatar name={u.displayName} photoUrl={u.photoUrl} size="sm" userId={u.uid} />
                  <div className="min-w-0">
                    <Link href={`/user/${u.uid}`} className="font-medium hover:text-[var(--color-accent)]">
                      {u.displayName}
                    </Link>
                    <p className="truncate text-xs text-slate-400">{u.email}</p>
                  </div>
                  <RoleBadge role={u.role} />
                </div>
                <DeleteAccountButton
                  target={u}
                  compact
                  onDeleted={loadUsers}
                  onError={setDeleteError}
                />
              </ModRow>
            ))
          )}
        </div>
      </ModSection>

      <div className="codex-mod-founder-panel space-y-3">
        <h2 className="codex-mod-founder-panel-title">Account</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Keep your Firestore role in sync if permissions ever look wrong after login. Your account
          cannot be demoted by other moderators, and only you can assign the Founder role.
        </p>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="codex-btn-founder rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Sync founder role to Firestore"}
        </button>
        {message && (
          <p className={`text-sm ${message.includes("failed") || message.includes("Failed") ? "text-red-300" : "text-[var(--color-text-muted)]"}`}>
            {message}
          </p>
        )}
      </div>
    </ModPageShell>
  );
}