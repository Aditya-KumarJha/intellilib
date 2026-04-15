"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";

import ActionRequiredPanel from "@/components/dashboard/librarian/ActionRequiredPanel";
import LibrarianStatsRow from "@/components/dashboard/librarian/LibrarianStatsRow";
import { useLibrarianDashboardData } from "@/components/dashboard/librarian/useLibrarianDashboardData";

const panelFallback = <div className="h-56 w-full animate-pulse rounded-2xl border border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5" />;

const LiveActivityFeedPanel = dynamic(
  () => import("@/components/dashboard/librarian/LiveActivityFeedPanel"),
  { loading: () => panelFallback }
);
const InventorySnapshotPanel = dynamic(
  () => import("@/components/dashboard/librarian/InventorySnapshotPanel"),
  { loading: () => panelFallback }
);
const MemberActivityInsightsPanel = dynamic(
  () => import("@/components/dashboard/librarian/MemberActivityInsightsPanel"),
  { loading: () => panelFallback }
);
const FinancialSnapshotPanel = dynamic(
  () => import("@/components/dashboard/librarian/FinancialSnapshotPanel"),
  { loading: () => panelFallback }
);
const SystemEfficiencyPanel = dynamic(
  () => import("@/components/dashboard/librarian/SystemEfficiencyPanel"),
  { loading: () => panelFallback }
);
const QuickActionsPanel = dynamic(
  () => import("@/components/dashboard/librarian/QuickActionsPanel"),
  { loading: () => panelFallback }
);

const MiniTrendsPanel = dynamic(
  () => import("@/components/dashboard/librarian/MiniTrendsPanel"),
  { loading: () => panelFallback }
);

const NotificationsPreviewPanel = dynamic(
  () => import("@/components/dashboard/librarian/NotificationsPreviewPanel"),
  { loading: () => panelFallback }
);

export default function LibrarianDashboardPage() {
  const { data, loading, error } = useLibrarianDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <motion.h2
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          Librarian Overview
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-1 max-w-3xl text-foreground/65"
        >
          Control-center view for desk priorities, live operations, inventory
          health, and circulation efficiency.
        </motion.p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          Live dashboard data could not be fully loaded: {error}
        </div>
      ) : null}

      <LibrarianStatsRow items={data.kpis} loading={loading} />
      <ActionRequiredPanel items={data.actionRequired} loading={loading} />

      <div className="grid gap-4 md:grid-cols-2 items-stretch">
        <LiveActivityFeedPanel items={data.liveActivity} loading={loading} />
        <InventorySnapshotPanel items={data.inventorySnapshot} loading={loading} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 items-stretch">
        <MemberActivityInsightsPanel items={data.memberInsights} loading={loading} />
        <FinancialSnapshotPanel items={data.financialSnapshot} loading={loading} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 items-stretch">
        <SystemEfficiencyPanel items={data.systemEfficiency} loading={loading} />
        <MiniTrendsPanel trends={data.miniTrends} loading={loading} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 items-stretch">
        <QuickActionsPanel />
        <NotificationsPreviewPanel items={data.notificationsPreview} loading={loading} />
      </div>
    </div>
  );
}
