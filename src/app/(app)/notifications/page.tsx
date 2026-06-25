"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/utils";
import {
  clearAllNotifications,
  deleteNotification,
  listenNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notificationService";
import type { AppNotification } from "@/models";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    return listenNotifications(setNotifications) || undefined;
  }, []);

  function getLink(n: AppNotification): string | null {
    if (n.type.includes("POST") && n.targetId) return `/post/${n.targetId}`;
    if (n.type.includes("CHESS") && n.targetId) return `/chess/game/${n.targetId}`;
    return null;
  }

  async function handleDelete(id: string) {
    setError("");
    setBusy(id);
    const prev = notifications;
    setNotifications((list) => list.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch (err) {
      setNotifications(prev);
      setError(err instanceof Error ? err.message : "Failed to delete notification");
    } finally {
      setBusy(null);
    }
  }

  async function handleClearAll() {
    if (!notifications.length) return;
    if (!confirm("Delete all notifications? This cannot be undone.")) return;
    setError("");
    setBusy("clear-all");
    const prev = notifications;
    setNotifications([]);
    try {
      await clearAllNotifications();
    } catch (err) {
      setNotifications(prev);
      setError(err instanceof Error ? err.message : "Failed to clear notifications");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex gap-3 text-sm">
          <button
            onClick={() => markAllNotificationsRead()}
            className="text-[var(--color-accent)]"
          >
            Mark all read
          </button>
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={busy === "clear-all"}
              className="text-red-300 hover:text-red-200 disabled:opacity-50"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {notifications.length === 0 ? (
        <p className="text-slate-400">No notifications yet.</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const href = getLink(n);
            const cardClass = `rounded-xl border p-4 ${
              n.read
                ? "border-white/10 bg-black/10"
                : "border-[var(--color-accent)]/30 bg-[var(--color-surface)]"
            }`;

            const body = (
              <>
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-slate-300">{n.body}</p>
                <p className="mt-1 text-xs text-slate-500">{timeAgo(n.createdAt)}</p>
              </>
            );

            return (
              <div key={n.id} className="flex items-start gap-2">
                {href ? (
                  <Link
                    href={href}
                    className={`min-w-0 flex-1 ${cardClass}`}
                    onClick={() => !n.read && markNotificationRead(n.id)}
                  >
                    {body}
                  </Link>
                ) : (
                  <div
                    className={`min-w-0 flex-1 ${cardClass}`}
                    onClick={() => !n.read && markNotificationRead(n.id)}
                  >
                    {body}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void handleDelete(n.id)}
                  disabled={busy === n.id}
                  className="codex-btn-ghost shrink-0 rounded-lg px-2.5 py-2 text-sm text-slate-400 hover:text-red-300 disabled:opacity-50"
                  aria-label="Delete notification"
                  title="Delete"
                >
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
