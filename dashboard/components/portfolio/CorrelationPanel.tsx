"use client";
import { useState } from "react";
import { type CorrelationResult, corrColor } from "@/lib/correlation";

interface CorrelationPanelProps {
  data: CorrelationResult;
}

export function CorrelationPanel({ data }: CorrelationPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const { matrix, symbols, groups, dataPoints } = data;

  const hasWarnings = groups.length > 0;

  return (
    <div className="mt-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Correlation Analysis</h3>
          <span className="text-xs text-gray-400">{dataPoints} trading days</span>
          {hasWarnings && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs px-2 py-0.5 font-medium">
              <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>
              {groups.length} high-correlation {groups.length === 1 ? "cluster" : "clusters"}
            </span>
          )}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1"
        >
          {expanded ? "Hide matrix" : "Show matrix"}
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" className={`transition-transform ${expanded ? "rotate-180" : ""}`}><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
        </button>
      </div>

      {/* Warning cards */}
      {hasWarnings && (
        <div className="space-y-2 mb-4">
          {groups.map((g) => {
            const pct = Math.round((g.symbols.length / symbols.length) * 100);
            return (
              <div key={g.symbols.join(",")} className="flex items-start gap-3 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 px-4 py-3 text-sm">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="text-orange-500 flex-none mt-0.5"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>
                <div>
                  <span className="font-semibold text-orange-800 dark:text-orange-300">
                    {g.symbols.join(", ")}
                  </span>
                  <span className="text-orange-700 dark:text-orange-400">
                    {" "}move together (avg correlation {g.avgCorrelation.toFixed(2)}).{" "}
                    {pct >= 40
                      ? `These ${g.symbols.length} positions represent concentrated risk — consider diversifying.`
                      : `These ${g.symbols.length} positions are not well diversified against each other.`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!hasWarnings && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 mb-4">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="flex-none"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
          Your holdings are well diversified — no high-correlation clusters detected.
        </div>
      )}

      {/* Correlation matrix (collapsible) */}
      {expanded && (
        <div className="overflow-x-auto rounded-2xl border bg-white dark:bg-neutral-900">
          <table className="text-xs text-center border-collapse">
            <thead>
              <tr>
                <th className="w-16 px-3 py-2 bg-gray-50 dark:bg-neutral-800 text-left text-gray-500"></th>
                {symbols.map((s) => (
                  <th key={s} className="px-3 py-2 bg-gray-50 dark:bg-neutral-800 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {symbols.map((row) => (
                <tr key={row}>
                  <td className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 text-left bg-gray-50 dark:bg-neutral-800 whitespace-nowrap">
                    {row}
                  </td>
                  {symbols.map((col) => {
                    const r = matrix[row][col];
                    const isDiag = row === col;
                    return (
                      <td
                        key={col}
                        className={`px-3 py-2 tabular-nums font-medium border border-gray-100 dark:border-neutral-700 ${
                          isDiag
                            ? "bg-gray-100 dark:bg-neutral-700 text-gray-400"
                            : r >= 0.7
                            ? corrColor(r) + " text-orange-800 dark:text-orange-300"
                            : corrColor(r) + " text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {r.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 flex items-center gap-4 border-t bg-gray-50 dark:bg-neutral-800 text-xs text-gray-400">
            <span>Legend:</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 dark:bg-red-900/50 inline-block"></span> ≥ 0.9 very high</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 dark:bg-orange-900/40 inline-block"></span> 0.7–0.9 high</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-50 dark:bg-yellow-900/20 inline-block"></span> 0.4–0.7 moderate</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white dark:bg-neutral-800 border inline-block"></span> &lt; 0.4 low</span>
          </div>
        </div>
      )}
    </div>
  );
}
