import { motion } from "framer-motion";

import { librarianMiniKpis } from "@/components/dashboard/librarian/data";

export default function LibrarianStatsRow() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {librarianMiniKpis.map((item, idx) => {
        const Icon = item.icon;
        return (
          <motion.article
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * idx }}
            className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur-md dark:border-white/10 dark:bg-white/5"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/55">
              <Icon className="h-4 w-4" aria-hidden />
              <span>{item.label}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{item.value}</p>
          </motion.article>
        );
      })}
    </div>
  );
}
