"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Construction } from "lucide-react";

import type { UserRole } from "@/lib/authStore";
import { dashboardHref } from "@/lib/dashboardNav";

type DashboardSectionPlaceholderProps = {
  role: UserRole;
  title: string;
  description: string;
};

export default function DashboardSectionPlaceholder({
  role,
  title,
  description,
}: DashboardSectionPlaceholderProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={dashboardHref(role, null)}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-foreground/70 transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to overview
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-black/10 bg-white/75 p-8 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
      >
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-6">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-purple-500/20 to-cyan-500/15 ring-1 ring-purple-500/25">
            <Construction className="h-8 w-8 text-purple-600 dark:text-purple-300" aria-hidden />
          </span>
          <div className="mt-4 min-w-0 sm:mt-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="mt-2 text-foreground/65">{description}</p>
            <p className="mt-4 rounded-xl border border-dashed border-black/15 bg-black/[0.02] px-4 py-3 text-sm text-foreground/55 dark:border-white/15 dark:bg-white/[0.03]">
              This area is static for now. Next steps: wire Supabase queries, realtime channels, and
              AI flows—then swap this placeholder for the live experience.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
