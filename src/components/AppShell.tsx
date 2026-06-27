"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { BottomNav } from "@/components/navigation/BottomNav";
import { RightRail } from "@/components/navigation/RightRail";
import { SidebarNav } from "@/components/navigation/SidebarNav";
import { useAuthStore } from "@/stores/authStore";
import { useIncomingCallStore } from "@/stores/incomingCallStore";
import { listenNotifications } from "@/services/notificationService";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuthStore();
  const incomingSession = useIncomingCallStore((s) => s.session);
  const expandIncomingCall = useIncomingCallStore((s) => s.expand);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsub = listenNotifications(
      (notifs) => {
        setUnread(notifs.filter((n) => !n.read).length);
      },
      () => setUnread(0)
    );
    return () => unsub?.();
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="codex-bg flex min-h-screen items-center justify-center codex-text-muted">
        <span className="codex-logo text-lg">Loading Codex...</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="codex-bg flex min-h-screen">
      <SidebarNav unread={unread} />

      <div className="flex min-w-0 flex-1 justify-center">
        <main className="codex-main-column pb-16 xl:pb-0">
          {incomingSession && (
            <button
              type="button"
              onClick={expandIncomingCall}
              className="flex w-full items-center justify-center gap-2 border-b border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300"
            >
              <Phone className="h-4 w-4" />
              Incoming call — tap to answer
            </button>
          )}
          {children}
        </main>
        <RightRail />
      </div>

      <BottomNav unread={unread} />
    </div>
  );
}