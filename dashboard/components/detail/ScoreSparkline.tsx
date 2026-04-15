"use client";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import type { ScoreHistoryPoint } from "@/app/actions";

interface Props {
  data: ScoreHistoryPoint[];
  latest: number;
}

export function ScoreSparkline({ data, latest }: Props) {
  if (data.length < 2) return null;

  const first = data[0].final_score;
  const rising = latest >= first;
  const color = rising ? "#10b981" : "#ef4444";

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">Score 60d</span>
        <span className={`text-xs font-semibold ${rising ? "text-emerald-500" : "text-red-500"}`}>
          {rising ? "▲" : "▼"} {Math.abs(latest - first).toFixed(1)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={48}>
        <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line
            type="monotone"
            dataKey="final_score"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, padding: "2px 6px", borderRadius: 6 }}
            formatter={(v: number) => [v.toFixed(1), "Score"]}
            labelFormatter={(idx: number) => data[idx]?.date?.slice(0, 10) ?? ""}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
