"use client";
import { useState } from "react";
import { type CorrelationResult, corrColor } from "@/lib/correlation";
import { t } from "@/app/i18n";
import type { Lang } from "@/app/types";

interface CorrelationPanelProps {
  data: CorrelationResult;
  lang: Lang;
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

function scoreGrade(score: number, lang: Lang): { label: string; color: string; ring: string; text: string } {
  const es = lang === "es";
  if (score >= 80) return { label: es ? "Excelente" : "Excellent", color: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-400", text: es ? "Tus posiciones están bien distribuidas entre distintos factores de mercado." : "Your holdings are well spread across different market drivers." };
  if (score >= 65) return { label: es ? "Buena" : "Good", color: "text-green-600 dark:text-green-400", ring: "ring-green-400", text: es ? "Mayormente diversificado, con algunos pares que comparten factores comunes." : "Mostly diversified, with a few pairs that share common drivers." };
  if (score >= 45) return { label: es ? "Moderada" : "Moderate", color: "text-yellow-600 dark:text-yellow-400", ring: "ring-yellow-400", text: es ? "Comienzan a formarse clusters — hay margen para reducir la superposición." : "Some clusters are forming — there's room to reduce overlap." };
  if (score >= 25) return { label: es ? "Pobre" : "Poor", color: "text-orange-600 dark:text-orange-400", ring: "ring-orange-400", text: es ? "Varias posiciones se mueven juntas. Una caída afectaría ampliamente al portafolio." : "Several positions move together. A downturn would hit the portfolio broadly." };
  return { label: es ? "Crítica" : "Critical", color: "text-red-600 dark:text-red-400", ring: "ring-red-400", text: es ? "Correlación global muy alta. Efectivamente tienes pocas apuestas independientes." : "High portfolio-wide correlation. You are effectively holding few independent bets." };
}

function clusterSeverity(r: number, lang: Lang): { label: string; border: string; bg: string; titleColor: string; bodyColor: string } {
  const es = lang === "es";
  if (r >= 0.9) return { label: es ? "Muy alta" : "Very high", border: "border-red-200 dark:border-red-800", bg: "bg-red-50 dark:bg-red-900/20", titleColor: "text-red-800 dark:text-red-300", bodyColor: "text-red-700 dark:text-red-400" };
  return { label: es ? "Alta" : "High", border: "border-orange-200 dark:border-orange-800", bg: "bg-orange-50 dark:bg-orange-900/20", titleColor: "text-orange-800 dark:text-orange-300", bodyColor: "text-orange-700 dark:text-orange-400" };
}

function clusterMessage(g: { symbols: string[]; avgCorrelation: number }, totalSymbols: number, lang: Lang): string {
  const pct = Math.round((g.symbols.length / totalSymbols) * 100);
  const r = g.avgCorrelation;
  const es = lang === "es";
  if (r >= 0.9) return es
    ? `Estas ${g.symbols.length} posiciones son apuestas casi idénticas — cuando una cae, las otras la siguen con un ${Math.round(r * 100)}% de predictibilidad. Considera reemplazar una por un activo menos correlacionado.`
    : `These ${g.symbols.length} positions are almost identical bets — when one drops, the others likely follow with ${Math.round(r * 100)}% predictability. Consider replacing one with a less correlated asset.`;
  if (pct >= 50) return es
    ? `Este cluster representa el ${pct}% de las posiciones de tu portafolio. Un único evento macroeconómico que afecte a este grupo impactaría la mayoría de tu portafolio simultáneamente.`
    : `This cluster makes up ${pct}% of your portfolio positions. A single macro event affecting this group would hit the majority of your portfolio simultaneously.`;
  return es
    ? `En mercados tranquilos puede parecer inofensivo, pero la correlación se dispara en caídas. Estas ${g.symbols.length} posiciones probablemente bajarán juntas cuando aumente la volatilidad.`
    : `During calm markets this may seem fine, but correlations spike during downturns. These ${g.symbols.length} positions will likely fall together when volatility hits.`;
}

function buildStrategies(
  groups: { symbols: string[]; avgCorrelation: number }[],
  symbols: string[],
  score: number,
  lang: Lang,
): string[] {
  const es = lang === "es";
  const tips: string[] = [];
  if (groups.length > 0) {
    for (const g of groups) {
      tips.push(es
        ? `En el cluster ${g.symbols.join(" / ")}: conserva tu posición de mayor convicción y explora reemplazar otra por un sector o clase de activo diferente (ej. un ETF internacional, un fondo de bonos o una materia prima).`
        : `In the cluster ${g.symbols.join(" / ")}: keep your highest-conviction pick and explore replacing another with a different sector or asset class (e.g. an international ETF, a bond fund, or a commodity).`);
    }
  }
  if (score < 65) {
    tips.push(es
      ? "Considera agregar activos de sectores o clases distintas: bonos (ej. BND, TLT), materias primas (GLD, DJP) o acciones internacionales (VEA, EEM) suelen tener baja correlación con acciones estadounidenses."
      : "Consider adding assets from different sectors or asset classes: bonds (e.g. BND, TLT), commodities (GLD, DJP), or international equities (VEA, EEM) tend to have low correlation to US equities.");
  }
  if (symbols.length < 8) {
    tips.push(es
      ? `Con solo ${symbols.length} posiciones, agregar 3–5 más no correlacionadas reduciría significativamente el riesgo global sin perjudicar el retorno esperado.`
      : `With only ${symbols.length} holdings, adding 3–5 more uncorrelated positions would significantly lower your portfolio-wide risk without hurting expected returns.`);
  }
  if (score >= 65 && groups.length === 0) {
    tips.push(es
      ? "Revisa la correlación mensualmente — los sectores rotan y un par no correlacionado el trimestre pasado puede converger tras noticias macroeconómicas o ciclos de resultados."
      : "Re-check correlation every month — sectors rotate over time and a pair that was uncorrelated last quarter may converge after macro news.");
    tips.push(es
      ? "Procura mantener la correlación promedio por par por debajo de 0.50 en el portafolio completo a medida que agregas nuevas posiciones."
      : "Aim to keep average pairwise correlation below 0.50 across the full portfolio as you add new positions.");
  }
  tips.push(es
    ? "El tamaño de posición también importa: si dos acciones correlacionadas son inevitables, mantener una posición combinada más pequeña limita el impacto conjunto en la caída."
    : "Position sizing matters too: if two correlated stocks are unavoidable, holding a smaller position in the less-confident one limits the combined drawdown.");
  return tips;
}

// ── Component ──────────────────────────────────────────────────────────────
export function CorrelationPanel({ data, lang }: CorrelationPanelProps) {
  const [showMatrix, setShowMatrix] = useState(false);
  const [showLearn, setShowLearn] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const { matrix, symbols, groups, dataPoints } = data;

  const score = diversityScore(matrix, symbols);
  const grade = scoreGrade(score, lang);
  const hasWarnings = groups.length > 0;
  const strategies = buildStrategies(groups, symbols, score, lang);

  return (
    <div className="mt-8 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">{t("corrTitle", lang)}</h3>
        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-neutral-800 rounded-full px-2 py-0.5">{dataPoints} {t("corrDays", lang)}</span>
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
                    <span className={`text-sm font-bold ${grade.color}`}>{grade.label} {t("corrDiversif", lang)}</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{grade.text}</p>
                    {hasWarnings && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        {lang === "es"
                          ? `${groups.length} cluster${groups.length === 1 ? "" : "s"} de alta correlación en ${groups.reduce((s, g) => s + g.symbols.length, 0)} posiciones.`
                          : `${groups.length} high-correlation ${groups.length === 1 ? "cluster" : "clusters"} detected across ${groups.reduce((s, g) => s + g.symbols.length, 0)} positions.`}
                    </p>
                    )}
                </div>
            </div>

            {/* ── Cluster Warnings (full width) ── */}
            {hasWarnings && (
                <div>
                {/* Mobile-only summary toggle */}
                <button
                    onClick={() => setAlertsOpen((v) => !v)}
                    className="md:hidden w-full flex items-center justify-between rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 px-4 py-3 text-sm mb-1"
                >
                    <span className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-semibold">
                    <IconWarn />
                    <span>
                        {lang === "es"
                        ? `${groups.length} cluster${groups.length === 1 ? "" : "s"} detectado${groups.length === 1 ? "" : "s"}`
                        : `${groups.length} high-correlation ${groups.length === 1 ? "cluster" : "clusters"}`}
                        {" · "}
                        <span className="font-normal">{groups[0].symbols.slice(0, 3).join(", ")}</span>
                    </span>
                    </span>
                    <IconChevron open={alertsOpen} />
                </button>
                {/* Content: collapsible on mobile, always open on desktop */}
                <div className={`grid transition-all duration-300 ease-in-out ${alertsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr] md:grid-rows-[1fr]"}`}>
                    <div className="overflow-hidden">
                    <div className="space-y-2">
                    {groups.map((g) => {
                        const sev = clusterSeverity(g.avgCorrelation, lang);
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
                            <p className={sev.bodyColor}>{clusterMessage(g, symbols.length, lang)}</p>
                            </div>
                        </div>
                        );
                    })}
                    </div>
                    </div>
                </div>
                </div>
            )}

            {!hasWarnings && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
                <IconCheck />
                <span>{t("corrNoCluster", lang)}</span>
                </div>
            )}

        </div>

        {/* Action Steps card */}
        <div className="rounded-2xl border bg-white dark:bg-neutral-900 overflow-hidden">
          <button
            onClick={() => setStepsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-150 md:cursor-default"
          >
            <span className="flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" className="text-emerald-500 flex-none"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd"/></svg>
              {t("corrActionSteps", lang)}
            </span>
            <span className="md:hidden flex items-center gap-1.5 text-xs text-gray-400 font-normal">
              {strategies.length} {lang === "es" ? "pasos" : "steps"}
              <IconChevron open={stepsOpen} />
            </span>
          </button>
          <div className={`grid transition-all duration-300 ease-in-out ${stepsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr] md:grid-rows-[1fr]"}`}>
            <div className="overflow-hidden">
              <ul className="px-5 pb-4 pt-1 space-y-2">
                {strategies.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center flex-none">{i + 1}</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ── Full Matrix (full width, smooth collapsible) ── */}
      <div className="rounded-2xl border bg-white dark:bg-neutral-900 overflow-hidden">
        <button
          onClick={() => setShowMatrix((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-150"
        >
          <span>{t("corrMatrix", lang)}</span>
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
                <span>{t("corrLegend", lang)}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 dark:bg-red-900/50 inline-block"></span>≥ 0.9 {t("corrVeryHigh", lang)}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 dark:bg-orange-900/40 inline-block"></span>0.7–0.9 {t("corrHigh", lang)}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-50 dark:bg-yellow-900/20 inline-block"></span>0.4–0.7 {t("corrMod", lang)}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white dark:bg-neutral-800 border inline-block"></span>&lt; 0.4 {t("corrLow", lang)}</span>
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
            {t("corrLearnBtn", lang)}
          </span>
          <IconChevron open={showLearn} />
        </button>
        <div className={`grid transition-all duration-300 ease-in-out ${showLearn ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className="overflow-hidden">
            <div className="px-5 pb-5 space-y-5 text-sm text-gray-600 dark:text-gray-400 border-t dark:border-neutral-800">

              <div className="pt-4 space-y-2">
                <h5 className="font-semibold text-gray-800 dark:text-gray-200">{lang === "es" ? "¿Qué significa realmente la correlación?" : "What does correlation actually mean?"}</h5>
                <p>{lang === "es" ? <>La correlación mide cuánto se mueven dos activos en sincronía, en una escala de <strong className="text-gray-800 dark:text-gray-200">−1 a +1</strong>. Un valor de +1 significa que siempre se mueven en la misma dirección, por la misma magnitud. Un valor de 0 significa que se mueven de forma independiente. Un valor de −1 significa que se mueven en direcciones opuestas.</> : <>Correlation measures how much two assets move in sync, on a scale from <strong className="text-gray-800 dark:text-gray-200">−1 to +1</strong>. A value of +1 means they always move in the same direction, by the same amount. A value of 0 means they move independently. A value of −1 means they move in opposite directions.</>}</p>
                <p>{lang === "es" ? <>En un portafolio, lo importante es con qué frecuencia tus posiciones caen al mismo tiempo. Si todo baja junto, tener 10 acciones no ofrece más protección real que tener 1.</> : <>For a portfolio, what matters is how often your holdings fall <em>at the same time</em>. If everything drops together, owning 10 stocks offers no more real protection than owning 1.</>}</p>
              </div>

              <div className="rounded-xl border dark:border-neutral-700 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-neutral-800">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">{lang === "es" ? "Rango" : "Range"}</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">{lang === "es" ? "Qué significa" : "What it means"}</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">{lang === "es" ? "Ejemplo" : "Example"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-neutral-700">
                    <tr><td className="px-3 py-2 font-medium text-emerald-600">{lang === "es" ? "por debajo de 0.40" : "below 0.40"}</td><td className="px-3 py-2">{lang === "es" ? "Baja — mayormente independiente" : "Low — mostly independent"}</td><td className="px-3 py-2 text-gray-400">{lang === "es" ? "Acción EE.UU. + oro" : "US stock + gold"}</td></tr>
                    <tr><td className="px-3 py-2 font-medium text-yellow-600">0.40 – 0.70</td><td className="px-3 py-2">{lang === "es" ? "Moderada — comparten factores macro" : "Moderate — share some macro drivers"}</td><td className="px-3 py-2 text-gray-400">{lang === "es" ? "Dos sectores distintos" : "Two different sectors"}</td></tr>
                    <tr><td className="px-3 py-2 font-medium text-orange-600">0.70 – 0.90</td><td className="px-3 py-2">{lang === "es" ? "Alta — caen juntos en estrés" : "High — fall together in stress"}</td><td className="px-3 py-2 text-gray-400">{lang === "es" ? "Dos empresas tech" : "Two tech companies"}</td></tr>
                    <tr><td className="px-3 py-2 font-medium text-red-600">{lang === "es" ? "por encima de 0.90" : "above 0.90"}</td><td className="px-3 py-2">{lang === "es" ? "Muy alta — esencialmente la misma apuesta" : "Very high — essentially the same bet"}</td><td className="px-3 py-2 text-gray-400">MSFT + GOOGL in 2022</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="space-y-2">
                <h5 className="font-semibold text-gray-800 dark:text-gray-200">{lang === "es" ? "La ilusión de la diversificación" : "The illusion of diversification"}</h5>
                <p>{lang === "es" ? "El error más común de los inversores minoristas: comprar 6 acciones tech de EE.UU. y creer que están diversificados porque las empresas hacen cosas distintas. No lo están. Durante el ciclo de subida de tasas de 2022, las acciones FAANG cayeron 40–70% juntas — a pesar de estar en diferentes subsectores — porque compartían un factor común: el riesgo de duración en un entorno de tasas al alza." : "The most common mistake retail investors make: buying 6 US tech stocks and thinking they are diversified because the companies do different things. They are not. During the 2022 rate hike cycle, FAANG stocks dropped 40–70% together — despite being in different sub-sectors — because they shared a common driver: duration risk in a rising rate environment."}</p>
                <p>{lang === "es" ? <><i>Tener muchas posiciones no es lo mismo que tener posiciones independientes.</i> <strong className="text-gray-800 dark:text-gray-200">La correlación te indica el número real de apuestas independientes que estás haciendo.</strong></> : <>Owning many positions is not the same as owning independent positions. <strong className="text-gray-800 dark:text-gray-200">Correlation tells you the real number of independent bets you are making.</strong></>}</p>
              </div>

              <div className="space-y-2">
                <h5 className="font-semibold text-gray-800 dark:text-gray-200">{lang === "es" ? "Por qué la correlación se dispara en las crisis" : "Why correlations spike during crashes"}</h5>
                <p>{lang === "es" ? <>Los activos que parecen no correlacionados en mercados calmos suelen converger durante las crisis. Cuando aumenta el miedo, los inversores venden lo que pueden — sin importar los fundamentos. Oro, acciones y bonos cayeron juntos en marzo de 2020. Esto se llama <em>ruptura de correlación</em> y es por eso que mantener clases de activos verdaderamente distintas (no solo acciones diferentes) es importante.</> : <>Assets that seem uncorrelated in calm markets often converge during crises. When fear spikes, investors sell whatever they can — regardless of fundamentals. Gold, equities, and bonds all dropped together in March 2020. This is called <em>correlation breakdown</em> and it's why holding truly different asset classes (not just different stocks) is important.</>}</p>
              </div>

              <div className="space-y-2">
                <h5 className="font-semibold text-gray-800 dark:text-gray-200">{lang === "es" ? "El protocolo de 5 pasos para mantenerse bien diversificado" : "The 5-step protocol to stay well diversified"}</h5>
                <ol className="space-y-2 list-none">
                  {(lang === "es" ? [
                    { n: 1, text: "Revisa la correlación mensualmente. Los sectores rotan — un par no correlacionado el trimestre pasado puede converger tras noticias macro o ciclos de resultados." },
                    { n: 2, text: "Apunta a una correlación promedio por par por debajo de 0.50 en el portafolio completo. Una puntuación superior a 65 aquí es un objetivo saludable." },
                    { n: 3, text: "Mezcla clases de activos, no solo sectores. Bonos, materias primas, acciones internacionales y REITs históricamente tienen baja correlación con acciones de EE.UU. y entre sí." },
                    { n: 4, text: "No confundas diversidad sectorial con diversidad real. Cinco empresas tech — incluso en distintos subsectores — te dan una exposición tech concentrada. Los números de correlación te lo mostrarán." },
                    { n: 5, text: "Usa el tamaño de posición como válvula de seguridad. Si quieres mantener dos nombres correlacionados en los que crees, mantén una posición combinada más pequeña para limitar el impacto conjunto en la caída." },
                  ] : [
                    { n: 1, text: "Check correlation monthly. Sectors rotate — a pair that was uncorrelated last quarter may converge after macro news or earnings cycles." },
                    { n: 2, text: "Target average pairwise correlation below 0.50 across the whole portfolio. A score above 65 here is a healthy target." },
                    { n: 3, text: "Mix asset classes, not just sectors. Bonds, commodities, international equities, and REITs historically have low correlation to US equities and to each other." },
                    { n: 4, text: "Don't confuse sector diversity with true diversity. Five tech companies — even in different sub-sectors — give you concentrated tech exposure. The correlation numbers will show you this." },
                    { n: 5, text: "Use position sizing as a safety valve. If you want to hold two correlated names you believe in, hold a smaller combined position in them to limit the joint drawdown impact." },
                  ]).map(({ n, text }) => (
                    <li key={n} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center justify-center flex-none mt-0.5">{n}</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 text-blue-700 dark:text-blue-400 space-y-1">
                <p className="font-semibold">{lang === "es" ? "Un objetivo práctico" : "A practical goal"}</p>
                <p>{lang === "es" ? "Un portafolio minorista bien diversificado típicamente tiene una correlación promedio por par entre 0.20 y 0.45. Si la tuya supera 0.60, el portafolio actúa más como una apuesta concentrada única que como una canasta de inversiones independientes." : "A well-diversified retail portfolio typically has an average pairwise correlation between 0.20 and 0.45. If yours is above 0.60, the portfolio is acting more like a single concentrated bet than a basket of independent investments."}</p>
              </div>

            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
