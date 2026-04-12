"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";

import LibraryActivitySnapshot from "@/components/dashboard/admin/LibraryActivitySnapshot";
import UsageTrendPanel from "@/components/dashboard/admin/UsageTrendPanel";
import { miniKpis } from "@/components/dashboard/admin/data";

const panelFallback = <div className="h-56 w-full animate-pulse rounded-2xl border border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5" />;

const AIIntelligencePanel = dynamic(
  () => import("@/components/dashboard/admin/AIIntelligencePanel"),
  { loading: () => panelFallback }
);
const FinancialSnapshotPanel = dynamic(
  () => import("@/components/dashboard/admin/FinancialSnapshotPanel"),
  { loading: () => panelFallback }
);
const InventoryHealthPanel = dynamic(
  () => import("@/components/dashboard/admin/InventoryHealthPanel"),
  { loading: () => panelFallback }
);
const UserInsightsPanel = dynamic(
  () => import("@/components/dashboard/admin/UserInsightsPanel"),
  { loading: () => panelFallback }
);
const AlertsAttentionPanel = dynamic(
  () => import("@/components/dashboard/admin/AlertsAttentionPanel"),
  { loading: () => panelFallback }
);
const RecentActivityFeed = dynamic(
  () => import("@/components/dashboard/admin/RecentActivityFeed"),
  { loading: () => panelFallback }
);

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <motion.h2
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          Admin Overview
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-1 max-w-3xl text-foreground/65"
        >
          Live-feel command center with activity, analytics, AI impact,
          financial and operational watchlists.
        </motion.p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {miniKpis.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.article
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * idx }}
              className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur-md dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/55">
                <Icon className="h-4 w-4" aria-hidden />
                <span>{item.label}</span>
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {item.value}
              </p>
            </motion.article>
          );
        })}
      </div>

      <LibraryActivitySnapshot />
      <UsageTrendPanel />

      <div className="grid gap-4 md:grid-cols-2 items-stretch">
        <AIIntelligencePanel className="max-w-full" />
        <FinancialSnapshotPanel className="max-w-full" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 items-stretch">
        <InventoryHealthPanel className="max-w-full" />
        <UserInsightsPanel className="max-w-full" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 items-stretch">
        <AlertsAttentionPanel className="max-w-full" />
        <RecentActivityFeed className="max-w-full" />
      </div>
    </div>
  );
}
