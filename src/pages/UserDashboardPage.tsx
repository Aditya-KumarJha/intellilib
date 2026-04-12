"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";

import ActionRequiredCard from "@/components/dashboard/user/ActionRequiredCard";
import ReadingActivityStats from "@/components/dashboard/user/ReadingActivityStats";
import UserStatsRow from "@/components/dashboard/user/UserStatsRow";

const panelFallback = <div className="h-56 w-full animate-pulse rounded-2xl border border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5" />;

const ContinueReadingPanel = dynamic(
  () => import("@/components/dashboard/user/ContinueReadingPanel"),
  { loading: () => panelFallback }
);
const AIUsageInsightsPanel = dynamic(
  () => import("@/components/dashboard/user/AIUsageInsightsPanel"),
  { loading: () => panelFallback }
);
const UserRecentActivityFeed = dynamic(
  () => import("@/components/dashboard/user/UserRecentActivityFeed"),
  { loading: () => panelFallback }
);
const SmartNotificationsPanel = dynamic(
  () => import("@/components/dashboard/user/SmartNotificationsPanel"),
  { loading: () => panelFallback }
);
const QuickActionsPanel = dynamic(
  () => import("@/components/dashboard/user/QuickActionsPanel"),
  { loading: () => panelFallback }
);
const PersonalizedInsightsPanel = dynamic(
  () => import("@/components/dashboard/user/PersonalizedInsightsPanel"),
  { loading: () => panelFallback }
);

export default function UserDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <motion.h2
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          Member Overview
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-1 max-w-3xl text-foreground/65"
        >
          What to read next, what is urgent, and what to do now in one
          personalized workspace.
        </motion.p>
      </div>

      <UserStatsRow />
      <ActionRequiredCard />

      <div className="grid gap-4 md:grid-cols-2 items-stretch">
        <ContinueReadingPanel />
        <AIUsageInsightsPanel />
      </div>

      <ReadingActivityStats />

      <div className="grid gap-4 md:grid-cols-2 items-stretch">
        <UserRecentActivityFeed />
        <SmartNotificationsPanel />
      </div>

      <div className="grid gap-4 md:grid-cols-2 items-stretch">
        <QuickActionsPanel />
        <PersonalizedInsightsPanel />
      </div>
    </div>
  );
}
