"use client";

import { useMemo, useState } from "react";
import type { Lang, RankRow } from "@/app/types";
import type { CorrelationResult } from "@/lib/correlation";
import { buildPortfolioDiagnosis } from "@/lib/portfolioDiagnosis";
import type { Holding } from "@/lib/stockUtils";

type Props = { holdings: Holding[]; latestPrices: Record<string, { price: number }>; rows: RankRow[]; correlationData: CorrelationResult | null; lang: Lang };

export function PortfolioDiagnosis({ holdings, latestPrices, rows, correlationData, lang }: Props) {
  const diagnosis = useMemo(() => buildPortfolioDiagnosis(holdings, latestPrices, rows, correlationData), [holdings, latestPrices, rows, correlationData]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!diagnosis.activeCount) return null;

  async function analyze() {
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/analysis/portfolio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context: JSON.stringify(diagnosis), lang }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.analysis !== "string") throw new Error(typeof result.error === "string" ? result.error : "analysis_failed");
      setAnalysis(result.analysis);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setError(code === "agent_rate_limited" ? (lang === "es" ? "Límite temporal del servicio. Espera un minuto e intenta nuevamente." : "Temporary service limit. Wait a minute and try again.") : code === "agent_not_configured" || code === "agent_configuration" ? (lang === "es" ? "La IA no está configurada correctamente en este despliegue." : "AI is not configured correctly for this deployment.") : (lang === "es" ? "El diagnóstico IA no está disponible ahora. Intenta nuevamente." : "AI diagnosis is unavailable right now. Please try again."));
    } finally { setLoading(false); }
  }

  const topSector = diagnosis.sectors[0];
  return (
    <section className="mb-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/60 dark:bg-violet-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="font-semibold text-violet-950 dark:text-violet-100">{lang === "es" ? "Diagnóstico de portafolio" : "Portfolio diagnosis"}</h3><p className="mt-0.5 text-xs text-violet-800/75 dark:text-violet-200/75">{lang === "es" ? "Cálculos locales sobre tus posiciones; la IA solo los interpreta." : "Local calculations on your holdings; AI only interprets them."}</p></div>
        <button type="button" onClick={analyze} disabled={loading} className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">{loading ? (lang === "es" ? "Analizando…" : "Analyzing…") : (lang === "es" ? "Ver panorama IA" : "View AI overview")}</button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Metric label={lang === "es" ? "Posiciones" : "Holdings"} value={String(diagnosis.activeCount)} />
        <Metric label={lang === "es" ? "Mayor posición" : "Largest position"} value={diagnosis.topPosition ? `${diagnosis.topPosition.symbol} ${(diagnosis.topPosition.weight * 100).toFixed(0)}%` : "—"} />
        <Metric label={lang === "es" ? "Mayor sector" : "Largest sector"} value={topSector ? `${topSector.name} ${(topSector.weight * 100).toFixed(0)}%` : "—"} />
        <Metric label={lang === "es" ? "Relaciones altas" : "High relationships"} value={String(diagnosis.highCorrelationGroups.length)} />
      </div>
      {diagnosis.highCorrelationGroups.length > 0 && <p className="mt-3 text-xs text-violet-900 dark:text-violet-200">{lang === "es" ? "Se mueven de forma parecida: " : "Moving similarly: "}{diagnosis.highCorrelationGroups.slice(0, 2).map((group) => `${group.symbols.join(" + ")} (${group.correlation.toFixed(2)})`).join(" · ")}</p>}
      {diagnosis.scoreBuckets.low.length > 0 && <p className="mt-1 text-xs text-violet-900 dark:text-violet-200">{lang === "es" ? "Score bajo: " : "Low score: "}{diagnosis.scoreBuckets.low.join(", ")}</p>}
      {error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {analysis && <div className="mt-3 whitespace-pre-line rounded-xl bg-white/70 p-3 text-sm leading-relaxed text-violet-950 dark:bg-neutral-900/70 dark:text-violet-100">{analysis}</div>}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/70 px-3 py-2 dark:bg-neutral-900/70"><p className="text-[10px] uppercase tracking-wide text-violet-700 dark:text-violet-300">{label}</p><p className="mt-0.5 truncate font-semibold text-violet-950 dark:text-violet-100">{value}</p></div>;
}
