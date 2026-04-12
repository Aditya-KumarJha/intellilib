"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";

import ActionRequiredPanel from "@/components/dashboard/librarian/ActionRequiredPanel";
import LibrarianStatsRow from "@/components/dashboard/librarian/LibrarianStatsRow";

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
const MiniTrendsPanel = dynamic(
  () => import("@/components/dashboard/librarian/MiniTrendsPanel"),
  { loading: () => panelFallback }
);
const QuickActionsPanel = dynamic(
  () => import("@/components/dashboard/librarian/QuickActionsPanel"),
  { loading: () => panelFallback }
);
const NotificationsPreviewPanel = dynamic(
  () => import("@/components/dashboard/librarian/NotificationsPreviewPanel"),
  { loading: () => panelFallback }
);

export default function LibrarianDashboardPage() {
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

      <LibrarianStatsRow />
      <ActionRequiredPanel />

      <div className="grid gap-4 md:grid-cols-2 items-stretch">
        <LiveActivityFeedPanel />
        <InventorySnapshotPanel />
      </div>

      <div className="grid gap-4 md:grid-cols-2 items-stretch">
        <MemberActivityInsightsPanel />
        <FinancialSnapshotPanel />
      </div>

      <div className="grid gap-4 md:grid-cols-2 items-stretch">
        <SystemEfficiencyPanel />
        <MiniTrendsPanel />
      </div>

      <div className="grid gap-4 md:grid-cols-2 items-stretch">
        <QuickActionsPanel />
        <NotificationsPreviewPanel />
      </div>
    </div>
  );
}
