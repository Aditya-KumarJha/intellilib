"use client";

import { motion } from "framer-motion";
import * as Icons from "lucide-react";

import { cn } from "@/lib/utils";

type DashboardStatCardProps = {
  label: string;
  value: string;
  hint?: string;
  // Accept either a Lucide icon component or the icon's name (string) when passed from server components
  icon?: any;
  tone?: "violet" | "cyan" | "emerald" | "amber" | "rose";
  delay?: number;
};

const toneRing: Record<NonNullable<DashboardStatCardProps["tone"]>, string> = {
  violet: "from-purple-500/25 to-fuchsia-500/10 ring-purple-500/20 dark:ring-purple-400/25",
  cyan: "from-cyan-500/20 to-sky-500/10 ring-cyan-500/20 dark:ring-cyan-400/25",
  emerald: "from-emerald-500/20 to-teal-500/10 ring-emerald-500/20 dark:ring-emerald-400/25",
  amber: "from-amber-500/25 to-orange-500/10 ring-amber-500/20 dark:ring-amber-400/25",
  rose: "from-rose-500/25 to-pink-500/10 ring-rose-500/20 dark:ring-rose-400/25",
};

const toneIcon: Record<NonNullable<DashboardStatCardProps["tone"]>, string> = {
  violet: "text-purple-600 dark:text-purple-300",
  cyan: "text-cyan-600 dark:text-cyan-300",
  emerald: "text-emerald-600 dark:text-emerald-300",
  amber: "text-amber-600 dark:text-amber-300",
  rose: "text-rose-600 dark:text-rose-300",
};

export default function DashboardStatCard({
  label,
  value,
  hint,
  icon,
  tone = "violet",
  delay = 0,
}: DashboardStatCardProps) {
  const Icon = typeof icon === "string" ? (Icons as any)[icon] ?? null : icon ?? null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5",
        "bg-linear-to-br ring-1",
        toneRing[tone]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          {hint ? <p className="mt-1 text-sm text-foreground/55">{hint}</p> : null}
        </div>
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white/80 dark:border-white/10 dark:bg-white/10",
            toneIcon[tone]
          )}
        >
          {Icon ? <Icon className="h-5 w-5" aria-hidden /> : null}
        </span>
      </div>
    </motion.div>
  );
}
