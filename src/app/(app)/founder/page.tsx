"use client";

import { useAuthStore } from "@/stores/authStore";
import { syncFounderRole } from "@/services/authService";

export default function FounderToolsPage() {
  const { isFounder, refreshUser } = useAuthStore();

  if (!isFounder()) {
    return <p className="text-red-400">Founder access only.</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-amber-300">Founder Tools</h1>
      <p className="text-slate-300">
        You have full permissions across Codex — posts, comments, chats, moderation, and chess.
      </p>
      <button
        onClick={async () => { await syncFounderRole(); await refreshUser(); }}
        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black"
      >
        Sync founder role to Firestore
      </button>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
        <li>Use Mod Tools for user management</li>
        <li>Use Topic Moderation for banning/locking topics</li>
        <li>Your account cannot be demoted by other mods</li>
      </ul>
    </div>
  );
}