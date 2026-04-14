"use client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import type { PortfolioSnapshot } from "@/app/actions";
import type { Lang } from "@/app/types";

interface Props {
  snapshots: PortfolioSnapshot[];
  lang: Lang;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function fmtDate(dateStr: string, lang: Lang) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(lang === "es" ? "es-ES" : "en-US", { month: "short", day: "numeric" });
}

export function PortfolioPerformanceChart({ snapshots, lang }: Props) {
  if (!snapshots.length) return null;

  const cost = snapshots[0]?.total_cost ?? 0;
  const latest = snapshots.at(-1)!;
  const totalReturn = cost > 0 ? ((latest.total_value - cost) / cost) * 100 : 0;
  const positive = totalReturn >= 0;

  const data = snapshots.map((s) => ({
    date: s.date,
    value: s.total_value,
    cost: s.total_cost,
    pct: cost > 0 ? ((s.total_value - cost) / cost) * 100 : 0,
  }));

  const minVal = Math.min(...data.map((d) => Math.min(d.value, d.cost))) * 0.98;
  const maxVal = Math.max(...data.map((d) => Math.max(d.value, d.cost))) * 1.02;

  return (
    <div className="bg-white dark:bg-neutral-900 border dark:border-neutral-700 rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
            {lang === "es" ? "Rendimiento de cartera" : "Portfolio performance"}
          </p>
          <p className="text-2xl font-bold tabular-nums">{fmt(latest.total_value)}</p>
        </div>
        <div className="text-right">
          <span
            className={`inline-block text-sm font-bold tabular-nums px-2 py-0.5 rounded-full ${
              positive
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
            }`}
          >
            {positive ? "+" : ""}{totalReturn.toFixed(2)}%
          </span>
          <p className="text-xs text-gray-400 mt-1">
            {lang === "es" ? "vs costo total" : "vs total cost"} {fmt(cost)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={positive ? "#10b981" : "#ef4444"} stopOpacity={0.25} />
                <stop offset="95%" stopColor={positive ? "#10b981" : "#ef4444"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => fmtDate(v, lang)}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minVal, maxVal]}
              tickFormatter={fmt}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#fff",
              }}
              formatter={(val: number, name: string) => [
                fmt(val),
                name === "value"
                  ? (lang === "es" ? "Valor" : "Value")
                  : (lang === "es" ? "Costo" : "Cost"),
              ]}
              labelFormatter={(label) => fmtDate(label, lang)}
            />
            <ReferenceLine
              y={cost}
              stroke="#9ca3af"
              strokeDasharray="4 2"
              strokeWidth={1}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={positive ? "#10b981" : "#ef4444"}
              strokeWidth={2}
              fill="url(#portGrad)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
