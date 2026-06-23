"use client";

import { useEffect, useState } from "react";
import { ModerationMenu } from "@/components/ModerationMenu";
import { ModPageShell, ModSection, ModStatGrid } from "@/components/ModPageShell";
import { syncFounderRole } from "@/services/authService";
import { computeModerationStats, getUsersForModeration } from "@/services/moderationService";
import { useAuthStore } from "@/stores/authStore";

export default function FounderToolsPage() {
  const { isFounder, refreshUser } = useAuthStore();
  const [stats, setStats] = useState<ReturnType<typeof computeModerationStats> | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isFounder()) return;
    getUsersForModeration(500).then((users) => setStats(computeModerationStats(users)));
  }, [isFounder]);

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