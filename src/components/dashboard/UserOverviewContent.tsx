"use client";

import { motion } from "framer-motion";
import { BookOpen, Bot, CreditCard, Search } from "lucide-react";

import DashboardStatCard from "@/components/dashboard/DashboardStatCard";

const rows = [
  { title: "Designing Data-Intensive Applications", due: "Apr 18", status: "Issued" },
  { title: "Clean Architecture", due: "Apr 22", status: "Issued" },
  { title: "The Pragmatic Programmer", due: "—", status: "Returned" },
];

export default function UserOverviewContent() {
  return (
    <div className="space-y-8">
      <div>
        <motion.h2
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          Member overview
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-1 max-w-2xl text-foreground/65"
        >
          Your loans, fines, and AI shortcuts—designed for the IntelliLib member journey (static demo
          data).
        </motion.p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Books issued"
          value="3"
          hint="2 active · 1 in queue"
          icon={BookOpen}
          tone="violet"
          delay={0}
        />
        <DashboardStatCard
          label="Due this week"
          value="2"
          hint="Renew or return to avoid fines"
          icon={Search}
          tone="amber"
          delay={0.05}
        />
        <DashboardStatCard
          label="Outstanding fines"
          value="₹0"
          hint="Digital payments via Razorpay"
          icon={CreditCard}
          tone="emerald"
          delay={0.1}
        />
        <DashboardStatCard
          label="AI sessions (7d)"
          value="14"
          hint="Gemini + LangGraph assistant"
          icon={Bot}
          tone="cyan"
          delay={0.15}
        />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="min-w-0 rounded-3xl border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur-md lg:basis-1/2 dark:border-white/10 dark:bg-white/5"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-foreground">Reading desk</h3>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-200">
              Realtime-ready
            </span>
          </div>
          <p className="mt-1 text-sm text-foreground/55">
            Mirrors live issue/return once Supabase Realtime is connected.
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-black/3 text-foreground/55 dark:bg-white/4">
                <tr>
                  <th className="w-[60%] px-3 py-2.5 font-medium">Title</th>
                  <th className="w-[20%] px-3 py-2.5 font-medium">Due</th>
                  <th className="w-[20%] px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {rows.map((row) => (
                  <tr key={row.title} className="bg-white/40 dark:bg-transparent">
                    <td className="truncate px-3 py-2.5 font-medium text-foreground" title={row.title}>
                      {row.title}
                    </td>
                    <td className="px-3 py-2.5 text-foreground/65">{row.due}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={
                          row.status === "Issued"
                            ? "rounded-full bg-purple-500/15 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:text-purple-200"
                            : row.status === "Returned"
                              ? "rounded-full bg-slate-500/15 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300"
                              : "rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-200"
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="min-w-0 space-y-4 rounded-3xl border border-black/10 bg-linear-to-b from-purple-500/10 via-white/50 to-cyan-500/10 p-5 shadow-sm backdrop-blur-md lg:basis-1/2 dark:border-white/10 dark:from-purple-500/15 dark:via-white/5 dark:to-cyan-500/10"
        >
          <h3 className="text-lg font-semibold text-foreground">Try asking the assistant</h3>
          <ul className="space-y-3 text-sm text-foreground/70">
            <li className="rounded-xl border border-white/20 bg-white/40 px-3 py-2 dark:border-white/10 dark:bg-white/5">
              “Suggest AI books for beginners”
            </li>
            <li className="rounded-xl border border-white/20 bg-white/40 px-3 py-2 dark:border-white/10 dark:bg-white/5">
              “Where is Clean Code on the shelf?”
            </li>
            <li className="rounded-xl border border-white/20 bg-white/40 px-3 py-2 dark:border-white/10 dark:bg-white/5">
              “Which books have I issued?”
            </li>
          </ul>
          <p className="text-xs text-foreground/50">
            Natural language is the primary navigation layer—UI fills in the gaps.
          </p>
        </motion.aside>
      </div>
    </div>
  );
}
