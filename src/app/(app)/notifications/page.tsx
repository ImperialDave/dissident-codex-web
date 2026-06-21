"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/utils";
import { listenNotifications, markAllNotificationsRead, markNotificationRead } from "@/services/notificationService";
import type { AppNotification } from "@/models";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    return listenNotifications(setNotifications) || undefined;
  }, []);

  function getLink(n: AppNotification): string | null {
    if (n.type.includes("POST") && n.targetId) return `/post/${n.targetId}`;
    if (n.type.includes("CHESS") && n.targetId) return `/chess/game/${n.targetId}`;
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button onClick={markAllNotificationsRead} className="text-sm text-[var(--color-accent)]">
          Mark all read
        </button>
      </div>
      {notifications.length === 0 ? (
        <p className="text-slate-400">No notifications yet.</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const href = getLink(n);
            const content = (
              <div
                className={`rounded-xl border p-4 ${n.read ? "border-white/10 bg-black/10" : "border-[var(--color-accent)]/30 bg-[var(--color-surface)]"}`}
                onClick={() => !n.read && markNotificationRead(n.id)}
              >
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-slate-300">{n.body}</p>
                <p className="mt-1 text-xs text-slate-500">{timeAgo(n.createdAt)}</p>
              </div>
            );
            return href ? (
              <Link key={n.id} href={href}>{content}</Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}