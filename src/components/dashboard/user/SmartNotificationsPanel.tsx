"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";

import UserPanelCard from "@/components/dashboard/user/UserPanelCard";
import { supabase } from "@/lib/supabaseClient";

type SmartNotification = {
  title: string;
  description: string;
};

export default function SmartNotificationsPanel() {
  const [smartNotifications, setSmartNotifications] = useState<SmartNotification[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId || !mounted) return;

      const { data } = await supabase
        .from("notifications")
        .select("type,message")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);

      if (!mounted) return;

      const mapped = (data ?? []).map((item) => ({
        title: String(item.type ?? "Notification")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase()),
        description: String(item.message ?? "No details available."),
      }));

      setSmartNotifications(mapped);
    }

    void load().catch(() => {
      // Ignore auth race errors; a subsequent state change will refetch.
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <UserPanelCard
      title="Smart Notifications"
      subtitle="Preview of your most relevant alerts"
      className="h-full max-w-full"
      delay={0.3}
    >
      <div className="space-y-3">
        {smartNotifications.length === 0 ? (
          <article className="rounded-2xl border border-black/10 bg-white/60 p-3 text-sm text-foreground/60 dark:border-white/10 dark:bg-white/5">
            No notifications yet.
          </article>
        ) : null}
        {smartNotifications.map((item, index) => (
          <article
            key={`${item.title}-${item.description}-${index}`}
            className="rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
          >
            <p className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
              <BellRing className="h-4 w-4 text-amber-500" aria-hidden />
              {item.title}
            </p>
            <p className="mt-1 text-xs text-foreground/60">{item.description}</p>
          </article>
        ))}
      </div>
    </UserPanelCard>
  );
}
