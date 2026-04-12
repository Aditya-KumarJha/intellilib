import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

type CompactMetricCardProps = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: "violet" | "cyan" | "emerald" | "amber";
  delay?: number;
};

const toneClasses: Record<CompactMetricCardProps["tone"], string> = {
  violet: "ring-purple-500/25 from-purple-500/20 to-fuchsia-500/10 text-purple-700 dark:text-purple-300",
  cyan: "ring-cyan-500/25 from-cyan-500/20 to-sky-500/10 text-cyan-700 dark:text-cyan-300",
  emerald: "ring-emerald-500/25 from-emerald-500/20 to-teal-500/10 text-emerald-700 dark:text-emerald-300",
  amber: "ring-amber-500/25 from-amber-500/20 to-orange-500/10 text-amber-700 dark:text-amber-300",
};

export default function CompactMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  delay = 0,
}: CompactMetricCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/55">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="mt-1 text-xs text-foreground/55">{hint}</p>
        </div>
        <span
          className={[
            "inline-flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br ring-1",
            toneClasses[tone],
          ].join(" ")}
        >
          <Icon className="h-4.5 w-4.5" aria-hidden />
        </span>
      </div>
    </motion.article>
  );
}
