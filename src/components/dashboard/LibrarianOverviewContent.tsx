"use client";

import { motion } from "framer-motion";
import { BookMarked, BookOpenCheck, Clock3, Users } from "lucide-react";

import DashboardStatCard from "@/components/dashboard/DashboardStatCard";

const queue = [
  { who: "A. Kumar", what: "Deep Learning (reserve)", when: "12m ago" },
  { who: "S. Patel", what: "Extension · DSA Handbook", when: "28m ago" },
  { who: "M. Chen", what: "Return · System Design", when: "1h ago" },
];

export default function LibrarianOverviewContent() {
  return (
    <div className="space-y-8">
      <div>
        <motion.h2
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          Librarian operations
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-1 max-w-2xl text-foreground/65"
        >
          Desk-first layout for catalog, circulation, and approvals—tuned for realtime activity
          (static demo metrics).
        </motion.p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Loans today"
          value="47"
          hint="+12% vs last week"
          icon={BookOpenCheck}
          tone="violet"
        />
        <DashboardStatCard
          label="Overdue"
          value="9"
          hint="Auto fine rules active"
          icon={Clock3}
          tone="rose"
          delay={0.05}
        />
        <DashboardStatCard
          label="Pending requests"
          value="6"
          hint="Reservations & extensions"
          icon={BookMarked}
          tone="amber"
          delay={0.1}
        />
        <DashboardStatCard
          label="Active members"
          value="1.2k"
          hint="Campus + remote access"
          icon={Users}
          tone="cyan"
          delay={0.15}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3 rounded-3xl border border-black/10 bg-white/70 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5"
        >
          <h3 className="text-lg font-semibold text-foreground">Request queue</h3>
          <p className="mt-1 text-sm text-foreground/55">
            Will subscribe to Supabase channels for live inserts and status changes.
          </p>
          <ul className="mt-5 space-y-3">
            {queue.map((item) => (
              <li
                key={item.what + item.who}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-white/5"
              >
                <div>
                  <p className="font-medium text-foreground">{item.what}</p>
                  <p className="text-sm text-foreground/55">{item.who}</p>
                </div>
                <span className="text-xs text-foreground/45">{item.when}</span>
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-2 rounded-3xl border border-black/10 bg-white/70 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5"
        >
          <h3 className="text-lg font-semibold text-foreground">Shift checklist</h3>
          <ul className="mt-4 space-y-3 text-sm text-foreground/70">
            <li className="flex gap-2">
              <span className="text-purple-500">●</span>
              Verify overnight returns scanner
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-500">●</span>
              Clear expired holds (auto job)
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500">●</span>
              Publish new arrivals to discovery feed
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500">●</span>
              Review audit log anomalies
            </li>
          </ul>
        </motion.section>
      </div>
    </div>
  );
}
