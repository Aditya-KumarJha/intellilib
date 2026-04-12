type TrendSparklineProps = {
  values: number[];
  labels: string[];
  color: "violet" | "cyan" | "emerald";
  yFormatter?: (value: number) => string;
};

const barClass: Record<TrendSparklineProps["color"], string> = {
  violet: "from-purple-500/25 to-purple-500/80",
  cyan: "from-cyan-500/25 to-cyan-500/80",
  emerald: "from-emerald-500/25 to-emerald-500/80",
};

export default function TrendSparkline({
  values,
  labels,
  color,
  yFormatter = (value) => String(value),
}: TrendSparklineProps) {
  const max = Math.max(...values, 1);

  return (
    <div>
      <div className="grid h-24 grid-cols-7 items-end gap-2">
        {values.map((value, idx) => {
          const height = Math.max((value / max) * 100, 8);
          return (
            <div key={`${labels[idx]}-${value}`} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-foreground/45">{yFormatter(value)}</span>
              <div
                className={[
                  "w-full rounded-md bg-linear-to-t",
                  barClass[color],
                ].join(" ")}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2 text-center text-[10px] text-foreground/45">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}
