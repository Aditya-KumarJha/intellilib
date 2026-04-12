"use client";

import { motion } from "framer-motion";
import { Cpu, LineChart, ShieldCheck, Wallet } from "lucide-react";

import DashboardStatCard from "@/components/dashboard/DashboardStatCard";

const health = [
  { name: "Supabase Realtime", status: "Healthy", detail: "42 concurrent channels" },
  { name: "Gemini API", status: "Nominal", detail: "P95 780ms" },
  { name: "Razorpay webhooks", status: "Watch", detail: "1 retry in queue" },
];

export default function AdminOverviewContent() {
  return (
    <div className="space-y-8">
      <div>
        <motion.h2
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          System command center
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-1 max-w-2xl text-foreground/65"
        >
          Cross-cutting visibility for users, money movement, AI usage, and compliance (illustrative
          static values).
        </motion.p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Total catalog"
          value="18.4k"
          hint="Titles across 42 categories"
          icon={LineChart}
          tone="violet"
        />
        <DashboardStatCard
          label="Open fines"
          value="₹12.4k"
          hint="Awaiting digital settlement"
          icon={Wallet}
          tone="amber"
          delay={0.05}
        />
        <DashboardStatCard
          label="AI tokens (7d)"
          value="1.9M"
          hint="Gemini + LangGraph orchestration"
          icon={Cpu}
          tone="cyan"
          delay={0.1}
        />
        <DashboardStatCard
          label="Security score"
          value="94"
          hint="Audit coverage + MFA adoption"
          icon={ShieldCheck}
          tone="emerald"
          delay={0.15}
        />
      </div>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-3xl border border-black/10 bg-white/70 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5"
      >
        <h3 className="text-lg font-semibold text-foreground">Platform health</h3>
        <p className="mt-1 text-sm text-foreground/55">
          Operational tiles will pull from monitoring hooks and Supabase edge logs.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {health.map((item) => (
            <div
              key={item.name}
              className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5"
            >
              <p className="text-sm font-medium text-foreground">{item.name}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{item.status}</p>
              <p className="mt-1 text-xs text-foreground/50">{item.detail}</p>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
