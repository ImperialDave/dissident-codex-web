"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ModerationMenu } from "@/components/ModerationMenu";
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
    return <p className="text-red-400">Founder access only.</p>;
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
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-amber-300">Founder Tools</h1>
        <p className="text-slate-300">
          Full permissions across Codex — posts, comments, chats, moderation, and chess.
        </p>
        <ModerationMenu variant="pills" />
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            Users: {stats.total}
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            Mods: {stats.mods}
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            Admins: {stats.admins}
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            Banned: {stats.banned}
          </div>
        </div>
      )}

      <ModerationMenu variant="cards" />

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
        <h2 className="font-semibold text-amber-200">Account</h2>
        <p className="text-sm text-slate-300">
          Keep your Firestore role in sync if permissions ever look wrong after login.
        </p>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Sync founder role to Firestore"}
        </button>
        {message && <p className="text-sm text-slate-300">{message}</p>}
      </div>

      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
        <li>
          <Link href="/mod" className="text-blue-300 hover:text-blue-200">
            Mod Tools
          </Link>{" "}
          — manage users, posts, and comments
        </li>
        <li>
          <Link href="/mod/topics" className="text-blue-300 hover:text-blue-200">
            Topic Moderation
          </Link>{" "}
          — ban or lock topic chats
        </li>
        <li>Your account cannot be demoted by other moderators</li>
        <li>Only you can assign the Founder role to others</li>
      </ul>
    </div>
  );
}