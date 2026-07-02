"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { timeAgo, sanitizeUserError } from "@/lib/utils";
import {
  clearAllNotifications,
  deleteNotification,
  listenNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notificationService";
import type { AppNotification } from "@/models";
import clsx from "clsx";

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
      setError(sanitizeUserError(err, "Failed to delete notification"));
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
      setError(sanitizeUserError(err, "Failed to clear notifications"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        actions={
          <div className="flex gap-3 text-sm">
            <button
              onClick={() => markAllNotificationsRead()}
              className="text-[var(--color-accent)] hover:underline"
            >
              Mark all read
            </button>
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={busy === "clear-all"}
                className="text-red-300 hover:underline disabled:opacity-50"
              >
                Clear all
              </button>
            )}
          </div>
        }
      />

      {error && (
        <p className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {notifications.length === 0 ? (
        <p className="px-4 py-12 text-center codex-text-muted">No notifications yet.</p>
      ) : (
        <div>
          {notifications.map((n) => {
            const href = getLink(n);
            const content = (
              <>
                <p className="font-medium">{n.title}</p>
                <p className="text-sm codex-text-muted">{n.body}</p>
                <p className="mt-1 text-xs codex-text-muted">{timeAgo(n.createdAt)}</p>
              </>
            );

            return (
              <div
                key={n.id}
                className={clsx(
                  "codex-list-row flex items-start gap-2",
                  !n.read && "bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)]"
                )}
              >
                {href ? (
                  <Link
                    href={href}
                    className="min-w-0 flex-1"
                    onClick={() => !n.read && markNotificationRead(n.id)}
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    className="min-w-0 flex-1"
                    onClick={() => !n.read && markNotificationRead(n.id)}
                  >
                    {content}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void handleDelete(n.id)}
                  disabled={busy === n.id}
                  className="codex-btn-icon shrink-0 disabled:opacity-50"
                  aria-label="Delete notification"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}