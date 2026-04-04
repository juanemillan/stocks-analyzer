"use client";
import { useState } from "react";
import { type CorrelationResult, corrColor } from "@/lib/correlation";

interface CorrelationPanelProps {
  data: CorrelationResult;
}

// ── Icons ──────────────────────────────────────────────────────────────────
const IconWarn = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="flex-none">
    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
  </svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="flex-none">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/>
  </svg>
);
const IconChevron = ({ open }: { open: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
  </svg>
);

// ── Helpers ────────────────────────────────────────────────────────────────
function diversityScore(matrix: Record<string, Record<string, number>>, symbols: string[]): number {
  let sum = 0; let count = 0;
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      sum += matrix[symbols[i]][symbols[j]];
      count++;
    }
  }
  const avgCorr = count > 0 ? sum / count : 0;
  return Math.max(0, Math.min(100, Math.round((1 - avgCorr) * 100)));
}

function scoreGrade(score: number): { label: string; color: string; ring: string; text: string } {
  if (score >= 80) return { label: "Excellent", color: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-400", text: "Your holdings are well spread across different market drivers." };
  if (score >= 65) return { label: "Good", color: "text-green-600 dark:text-green-400", ring: "ring-green-400", text: "Mostly diversified, with a few pairs that share common drivers." };
  if (score >= 45) return { label: "Moderate", color: "text-yellow-600 dark:text-yellow-400", ring: "ring-yellow-400", text: "Some clusters are forming — there's room to reduce overlap." };
  if (score >= 25) return { label: "Poor", color: "text-orange-600 dark:text-orange-400", ring: "ring-orange-400", text: "Several positions move together. A downturn would hit the portfolio broadly." };
  return { label: "Critical", color: "text-red-600 dark:text-red-400", ring: "ring-red-400", text: "High portfolio-wide correlation. You are effectively holding few independent bets." };
}

function clusterSeverity(r: number): { label: string; border: string; bg: string; titleColor: string; bodyColor: string } {
  if (r >= 0.9) return { label: "Very high", border: "border-red-200 dark:border-red-800", bg: "bg-red-50 dark:bg-red-900/20", titleColor: "text-red-800 dark:text-red-300", bodyColor: "text-red-700 dark:text-red-400" };
  return { label: "High", border: "border-orange-200 dark:border-orange-800", bg: "bg-orange-50 dark:bg-orange-900/20", titleColor: "text-orange-800 dark:text-orange-300", bodyColor: "text-orange-700 dark:text-orange-400" };
}

function clusterMessage(g: { symbols: string[]; avgCorrelation: number }, totalSymbols: number): string {
  const pct = Math.round((g.symbols.length / totalSymbols) * 100);
  const r = g.avgCorrelation;
  if (r >= 0.9) return `These ${g.symbols.length} positions are almost identical bets — when one drops, the others likely follow with ${Math.round(r * 100)}% predictability. Consider replacing one with a less correlated asset.`;
  if (pct >= 50) return `This cluster makes up ${pct}% of your portfolio positions. A single macro event affecting this group would hit the majority of your portfolio simultaneously.`;
  return `During calm markets this may seem fine, but correlations spike during downturns. These ${g.symbols.length} positions will likely fall together when volatility hits.`;
}

function buildStrategies(
  groups: { symbols: string[]; avgCorrelation: number }[],
  symbols: string[],
  score: number
): string[] {
  const tips: string[] = [];
  if (groups.length > 0) {
    for (const g of groups) {
      tips.push(`In the cluster ${g.symbols.join(" / ")}: keep your highest-conviction pick and explore replacing another with a different sector or asset class (e.g. an international ETF, a bond fund, or a commodity).`);
    }
  }
  if (score < 65) {
    tips.push("Consider adding assets from different sectors or asset classes: bonds (e.g. BND, TLT), commodities (GLD, DJP), or international equities (VEA, EEM) tend to have low correlation to US equities.");
  }
  if (symbols.length < 8) {
    tips.push(`With only ${symbols.length} holdings, adding 3–5 more uncorrelated positions would significantly lower your portfolio-wide risk without hurting expected returns.`);
  }
  if (score >= 65 && groups.length === 0) {
    tips.push("Re-check correlation every month — sectors rotate over time and a pair that was uncorrelated last quarter may converge after macro news.");
    tips.push("Aim to keep average pairwise correlation below 0.50 across the full portfolio as you add new positions.");
  }
  tips.push("Position sizing matters too: if two correlated stocks are unavoidable, holding a smaller position in the less-confident one limits the combined drawdown.");
  return tips;
}

// ── Component ──────────────────────────────────────────────────────────────
export function CorrelationPanel({ data }: CorrelationPanelProps) {
  const [showMatrix, setShowMatrix] = useState(false);
  const [showLearn, setShowLearn] = useState(false);
  const { matrix, symbols, groups, dataPoints } = data;

  const score = diversityScore(matrix, symbols);
  const grade = scoreGrade(score);
  const hasWarnings = groups.length > 0;
  const strategies = buildStrategies(groups, symbols, score);

  return (
    <div className="mt-8 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">Correlation Analysis</h3>
        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-neutral-800 rounded-full px-2 py-0.5">{dataPoints} trading days</span>
      </div>

      {/* ── Top row: Score + Action Steps side-by-side on desktop ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">

        <div className="grid gap-4">

            {/* Diversity Score card */}
            <div className="flex items-center gap-4 rounded-2xl border bg-white dark:bg-neutral-900 px-5 py-4">
                <div className={`w-14 h-14 rounded-full ring-4 ${grade.ring} flex flex-col items-center justify-center flex-none`}>
                    <span className={`text-xl font-bold tabular-nums leading-none ${grade.color}`}>{score}</span>
                    <span className="text-[9px] text-gray-400 mt-0.5">/ 100</span>
                </div>
                <div>
                    <span className={`text-sm font-bold ${grade.color}`}>{grade.label} Diversification</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{grade.text}</p>
                    {hasWarnings && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        {groups.length} high-correlation {groups.length === 1 ? "cluster" : "clusters"} detected across {groups.reduce((s, g) => s + g.symbols.length, 0)} positions.
                    </p>
                    )}
                </div>
            </div>

            {/* ── Cluster Warnings (full width) ── */}
            {hasWarnings && (
                <div className="space-y-2">
                {groups.map((g) => {
                    const sev = clusterSeverity(g.avgCorrelation);
                    return (
                    <div key={g.symbols.join(",")} className={`flex items-start gap-3 rounded-xl border ${sev.border} ${sev.bg} px-4 py-3 text-sm`}>
                        <IconWarn />
                        <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold ${sev.titleColor}`}>{g.symbols.join(", ")}</span>
                            <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${sev.bg} ${sev.titleColor} border ${sev.border}`}>
                            {sev.label} · r = {g.avgCorrelation.toFixed(2)}
                            </span>
                        </div>
                        <p className={sev.bodyColor}>{clusterMessage(g, symbols.length)}</p>
                        </div>
                    </div>
                    );
                })}
                </div>
            )}

            {!hasWarnings && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
                <IconCheck />
                <span>No high-correlation clusters detected. Your positions are driven by different market factors — that's exactly what you want.</span>
                </div>
            )}

        </div>

        {/* Action Steps card */}
        <div className="rounded-2xl border bg-white dark:bg-neutral-900 px-5 py-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" className="text-emerald-500 flex-none"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd"/></svg>
            Action steps for your portfolio
          </h4>
          <ul className="space-y-2">
            {strategies.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center flex-none">{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Full Matrix (full width, smooth collapsible) ── */}
      <div className="rounded-2xl border bg-white dark:bg-neutral-900 overflow-hidden">
        <button
          onClick={() => setShowMatrix((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-150"
        >
          <span>Full correlation matrix</span>
          <IconChevron open={showMatrix} />
        </button>
        <div className={`grid transition-all duration-300 ease-in-out ${showMatrix ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className="overflow-hidden">
            <div className="border-t dark:border-neutral-800">
              <div className="overflow-x-auto overflow-y-auto max-h-[420px]">
                <table className="text-xs text-center border-collapse">
                  <thead>
                    <tr>
                      <th className="w-16 px-3 py-2 bg-gray-50 dark:bg-neutral-800 text-left text-gray-500 sticky left-0 top-0 z-30"></th>
                      {symbols.map((s) => (
                        <th key={s} className="px-3 py-2 bg-gray-50 dark:bg-neutral-800 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap sticky top-0 z-20">{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {symbols.map((row) => (
                      <tr key={row}>
                        <td className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 text-left bg-gray-50 dark:bg-neutral-800 whitespace-nowrap sticky left-0 z-10">{row}</td>
                        {symbols.map((col) => {
                          const r = matrix[row][col];
                          const isDiag = row === col;
                          return (
                            <td key={col} className={`px-3 py-2 tabular-nums font-medium border border-gray-100 dark:border-neutral-700 ${isDiag ? "bg-gray-100 dark:bg-neutral-700 text-gray-400" : r >= 0.7 ? corrColor(r) + " text-orange-800 dark:text-orange-300" : corrColor(r) + " text-gray-600 dark:text-gray-400"}`}>
                              {r.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 flex flex-wrap items-center gap-3 border-t bg-gray-50 dark:bg-neutral-800 text-xs text-gray-400">
                <span>Legend:</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 dark:bg-red-900/50 inline-block"></span>≥ 0.9 very high</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 dark:bg-orange-900/40 inline-block"></span>0.7–0.9 high</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-50 dark:bg-yellow-900/20 inline-block"></span>0.4–0.7 moderate</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white dark:bg-neutral-800 border inline-block"></span>&lt; 0.4 low</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── How Correlation Works (full width, smooth collapsible) ── */}
      <div className="rounded-2xl border bg-white dark:bg-neutral-900 overflow-hidden">
        <button
          onClick={() => setShowLearn((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-150"
        >
          <span className="flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" className="text-blue-400 flex-none"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg>
            How correlation works and what to do about it
          </span>
          <IconChevron open={showLearn} />
        </button>
        <div className={`grid transition-all duration-300 ease-in-out ${showLearn ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className="overflow-hidden">
            <div className="px-5 pb-5 space-y-5 text-sm text-gray-600 dark:text-gray-400 border-t dark:border-neutral-800">

              <div className="pt-4 space-y-2">
                <h5 className="font-semibold text-gray-800 dark:text-gray-200">What does correlation actually mean?</h5>
                <p>Correlation measures how much two assets move in sync, on a scale from <strong className="text-gray-800 dark:text-gray-200">−1 to +1</strong>. A value of +1 means they always move in the same direction, by the same amount. A value of 0 means they move independently. A value of −1 means they move in opposite directions.</p>
                <p>For a portfolio, what matters is how often your holdings fall <em>at the same time</em>. If everything drops together, owning 10 stocks offers no more real protection than owning 1.</p>
              </div>

              <div className="rounded-xl border dark:border-neutral-700 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-neutral-800">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Range</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">What it means</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-neutral-700">
                    <tr><td className="px-3 py-2 font-medium text-emerald-600">below 0.40</td><td className="px-3 py-2">Low — mostly independent</td><td className="px-3 py-2 text-gray-400">US stock + gold</td></tr>
                    <tr><td className="px-3 py-2 font-medium text-yellow-600">0.40 – 0.70</td><td className="px-3 py-2">Moderate — share some macro drivers</td><td className="px-3 py-2 text-gray-400">Two different sectors</td></tr>
                    <tr><td className="px-3 py-2 font-medium text-orange-600">0.70 – 0.90</td><td className="px-3 py-2">High — fall together in stress</td><td className="px-3 py-2 text-gray-400">Two tech companies</td></tr>
                    <tr><td className="px-3 py-2 font-medium text-red-600">above 0.90</td><td className="px-3 py-2">Very high — essentially the same bet</td><td className="px-3 py-2 text-gray-400">MSFT + GOOGL in 2022</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="space-y-2">
                <h5 className="font-semibold text-gray-800 dark:text-gray-200">The illusion of diversification</h5>
                <p>The most common mistake retail investors make: buying 6 US tech stocks and thinking they are diversified because the companies do different things. They are not. During the 2022 rate hike cycle, FAANG stocks dropped 40–70% together — despite being in different sub-sectors — because they shared a common driver: duration risk in a rising rate environment.</p>
                <p>Owning many positions is not the same as owning independent positions. <strong className="text-gray-800 dark:text-gray-200">Correlation tells you the real number of independent bets you are making.</strong></p>
              </div>

              <div className="space-y-2">
                <h5 className="font-semibold text-gray-800 dark:text-gray-200">Why correlations spike during crashes</h5>
                <p>Assets that seem uncorrelated in calm markets often converge during crises. When fear spikes, investors sell whatever they can — regardless of fundamentals. Gold, equities, and bonds all dropped together in March 2020. This is called <em>correlation breakdown</em> and it's why holding truly different asset classes (not just different stocks) is important.</p>
              </div>

              <div className="space-y-2">
                <h5 className="font-semibold text-gray-800 dark:text-gray-200">The 5-step protocol to stay well diversified</h5>
                <ol className="space-y-2 list-none">
                  {[
                    { n: 1, text: "Check correlation monthly. Sectors rotate — a pair that was uncorrelated last quarter may converge after macro news or earnings cycles." },
                    { n: 2, text: "Target average pairwise correlation below 0.50 across the whole portfolio. A score above 65 here is a healthy target." },
                    { n: 3, text: "Mix asset classes, not just sectors. Bonds, commodities, international equities, and REITs historically have low correlation to US equities and to each other." },
                    { n: 4, text: "Don't confuse sector diversity with true diversity. Five tech companies — even in different sub-sectors — give you concentrated tech exposure. The correlation numbers will show you this." },
                    { n: 5, text: "Use position sizing as a safety valve. If you want to hold two correlated names you believe in, hold a smaller combined position in them to limit the joint drawdown impact." },
                  ].map(({ n, text }) => (
                    <li key={n} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center justify-center flex-none mt-0.5">{n}</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 text-blue-700 dark:text-blue-400 space-y-1">
                <p className="font-semibold">A practical goal</p>
                <p>A well-diversified retail portfolio typically has an average pairwise correlation between 0.20 and 0.45. If yours is above 0.60, the portfolio is acting more like a single concentrated bet than a basket of independent investments.</p>
              </div>

            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
