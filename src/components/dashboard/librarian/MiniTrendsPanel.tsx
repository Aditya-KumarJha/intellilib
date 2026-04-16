"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";

import LibrarianPanelCard from "@/components/dashboard/librarian/LibrarianPanelCard";
import type { LibrarianMiniTrends } from "@/components/dashboard/librarian/useLibrarianDashboardData";

type MiniTrendsPanelProps = {
  trends: LibrarianMiniTrends;
  loading?: boolean;
};

type TrendChartProps = {
  values: number[];
  labels: string[];
  stroke: string;
  area: string;
  yFormatter?: (value: number) => string;
};

function TrendChart({ values, labels, stroke, area, yFormatter }: TrendChartProps) {
  const data = labels.map((label, index) => ({
    label,
    value: Number(values[index] ?? 0),
  }));

  return (
    <div className="h-28 w-full min-w-0" style={{ minWidth: 0, minHeight: 112 }}>
      <ResponsiveContainer width="100%" height={112} minWidth={0}>
        <LineChart data={data} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${stroke.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={area} stopOpacity={0.35} />
              <stop offset="95%" stopColor={area} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(148,163,184,0.9)" }} axisLine={false} tickLine={false} />
          <YAxis hide domain={[0, "auto"]} />
          <Tooltip
            cursor={{ stroke: "rgba(148,163,184,0.4)", strokeWidth: 1 }}
            formatter={(value?: ValueType) => {
              const numeric = Number(value ?? 0);
              return yFormatter ? yFormatter(numeric) : numeric.toLocaleString("en-IN");
            }}
            labelStyle={{ color: "#0f172a", fontSize: 12 }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid rgba(15,23,42,0.08)",
              fontSize: 12,
              padding: "8px 10px",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2.2}
            dot={{ r: 2.5, fill: stroke, strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            fill={`url(#fill-${stroke.replace("#", "")})`}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function MiniTrendsPanel({ trends, loading = false }: MiniTrendsPanelProps) {
  return (
    <LibrarianPanelCard
      title="Mini Trends"
      subtitle="7-day directional trends"
      className="h-full max-w-full"
      delay={0.28}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-medium text-foreground">Loans trend</p>
          <div className="mt-3">
            <TrendChart values={trends.loans} labels={trends.labels} stroke="#8b5cf6" area="#8b5cf6" />
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-medium text-foreground">Requests trend</p>
          <div className="mt-3">
            <TrendChart values={trends.requests} labels={trends.labels} stroke="#06b6d4" area="#06b6d4" />
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-medium text-foreground">Fines trend</p>
          <div className="mt-3">
            <TrendChart values={trends.fines} labels={trends.labels} stroke="#10b981" area="#10b981" yFormatter={(value) => `INR ${value.toLocaleString("en-IN")}`} />
          </div>
        </div>
      </div>
      {loading ? <p className="mt-2 text-xs text-foreground/50">Refreshing trends from Supabase...</p> : null}
    </LibrarianPanelCard>
  );
}
