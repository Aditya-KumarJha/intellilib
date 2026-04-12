import { motion } from "framer-motion";

type LibrarianPanelCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export default function LibrarianPanelCard({
  title,
  subtitle,
  children,
  className,
  delay = 0,
}: LibrarianPanelCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className={[
        "rounded-3xl border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5 max-w-6xl",
        className ?? "",
      ].join(" ")}
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-foreground/60">{subtitle}</p> : null}
      </div>
      {children}
    </motion.section>
  );
}
