"use client";
import { t } from "@/app/i18n";
import type { Lang, RankRow, TurnRow, CompoundRow } from "@/app/types";
import { InfoBox } from "@/components/ui/InfoBox";
import { bucketColor, bucketDisplay } from "@/lib/stockUtils";
import { SymbolLogo } from "@/components/ui/SymbolLogo";
import type { Holding } from "@/lib/stockUtils";
import type { AlertRule } from "@/hooks/useAlerts";
import type { WatchlistDetails } from "@/hooks/useWatchlist";

interface OverviewTabProps {
  rows: RankRow[];
  marketPipelineUpdatedAt: string | null;
  turnRows: TurnRow[];
  filteredCompounders: CompoundRow[];
  cmpHorizon: "1Y" | "3Y" | "5Y";
  holdings: Holding[];
  latestPrices: Record<string, { price: number; date: string }>;
  weekChanges: Record<string, number>;
  techSignals: Record<string, boolean>;
  alertRules: AlertRule[];
  watchlist: Set<string>;
  watchlistDetails: Record<string, WatchlistDetails>;
  lang: Lang;
  setViewMode: (v: import("@/app/types").ViewMode) => void;
  onOpen: (row: RankRow) => void;
  onOpenFromSymbol: (
    symbol: string,
    name?: string | null,
    asset_type?: string | null,
    racional_url?: string | null,
    extras?: Partial<RankRow>,
  ) => void;
  onAskFollowUp?: (text: string) => void;
}

export function OverviewTab({
  rows,
  marketPipelineUpdatedAt,
  turnRows,
  filteredCompounders,
  cmpHorizon,
  holdings,
  latestPrices,
  weekChanges,
  techSignals,
  alertRules,
  watchlist,
  watchlistDetails,
  lang,
  setViewMode,
  onOpen,
  onOpenFromSymbol,
  onAskFollowUp,
}: OverviewTabProps) {
  const marketDate = rows.find((row) => row.date)?.date;
  const marketDataStale = marketDate != null && Date.now() - new Date(`${marketDate}T12:00:00`).getTime() > 4 * 24 * 60 * 60_000;
  const activeHoldings = holdings.filter((holding) => !holding.sold_at);
  const portfolioStats = activeHoldings.reduce(
    (acc, holding) => {
      const price = latestPrices[holding.symbol]?.price;
      if (price == null || holding.avg_cost == null) return acc;
      const invested = holding.shares * holding.avg_cost;
      const value = holding.shares * price;
      return { invested: acc.invested + invested, value: acc.value + value };
    },
    { invested: 0, value: 0 },
  );
  const pnlPercent = portfolioStats.invested > 0
    ? ((portfolioStats.value - portfolioStats.invested) / portfolioStats.invested) * 100
    : null;
  const portfolioAlerts = activeHoldings.filter((holding) => {
    const price = latestPrices[holding.symbol]?.price;
    const pnl = price != null && holding.avg_cost ? ((price / holding.avg_cost) - 1) * 100 : null;
    return (pnl != null && (pnl <= -20 || (pnl >= 20 && techSignals[holding.symbol]))) || Math.abs(weekChanges[holding.symbol] ?? 0) >= 10;
  });
  const opportunity = rows.find((row) => row.final_score != null && row.final_score >= 0.7 && !activeHoldings.some((holding) => holding.symbol === row.symbol));
  const opportunityScore = opportunity?.final_score;
  const trackedSymbols = new Set([...activeHoldings.map((holding) => holding.symbol), ...watchlist]);
  const firedAlert = alertRules
    .filter((rule) => rule.triggered_at)
    .sort((a, b) => new Date(b.triggered_at!).getTime() - new Date(a.triggered_at!).getTime())[0];
  const biggestWeeklyMove = activeHoldings
    .map((holding) => ({ symbol: holding.symbol, change: weekChanges[holding.symbol] }))
    .filter((item): item is { symbol: string; change: number } => item.change != null && Math.abs(item.change) >= 5)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
  const scoreMove = rows
    .filter((row) => trackedSymbols.has(row.symbol) && row.score_delta != null)
    .sort((a, b) => Math.abs(b.score_delta ?? 0) - Math.abs(a.score_delta ?? 0))[0];
  const reviewsDue = Object.entries(watchlistDetails)
    .filter(([, detail]) => detail.review_date && detail.review_date <= new Date().toISOString().slice(0, 10) && detail.status !== "passed")
    .map(([symbol]) => symbol);

  return (
    <div className="animate-fadeIn">
      <InfoBox text={t("infoOverviewText", lang)} label={t("infoHowItWorks", lang)} />
      <div className="mb-4">
        <h2 className="text-lg font-bold">{t("tabOverview", lang)}</h2>
        <p className="text-sm text-gray-500">
          {marketDate
            ? `${lang === "es" ? "Datos al" : "Data as of"} ${new Date(`${marketDate}T12:00:00`).toLocaleDateString(lang === "es" ? "es-ES" : "en-US", { dateStyle: "long" })}`
            : (lang === "es" ? "Cargando datos de mercado…" : "Loading market data…")}
        </p>
        {marketPipelineUpdatedAt && <p className="mt-0.5 text-xs text-gray-400">{lang === "es" ? "ETL exitoso:" : "Successful ETL:"} {new Date(marketPipelineUpdatedAt).toLocaleString(lang === "es" ? "es-CL" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</p>}
      </div>

      {marketDataStale && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {lang === "es" ? "Los datos de mercado tienen más de cuatro días. Algunas señales pueden estar atrasadas." : "Market data is more than four days old. Some signals may be delayed."}
        </div>
      )}

      <section className="mb-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm dark:border-indigo-900/70 dark:from-indigo-950/40 dark:to-neutral-900">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-indigo-950 dark:text-indigo-100">{lang === "es" ? "Mi día" : "My day"}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">{lang === "es" ? "Tu cartera y señales que merecen atención." : "Your portfolio and signals worth reviewing."}</p>
          </div>
          <button onClick={() => setViewMode("portfolio")} className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/40">
            {lang === "es" ? "Ver cartera" : "View portfolio"}
          </button>
        </div>
        {activeHoldings.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">{lang === "es" ? "Agrega posiciones para ver rendimiento y alertas personalizadas aquí." : "Add positions to see your performance and personalized alerts here."}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/80 p-3 dark:bg-neutral-900/80"><p className="text-xs text-gray-500">{lang === "es" ? "Posiciones activas" : "Active holdings"}</p><p className="mt-1 text-xl font-bold">{activeHoldings.length}</p></div>
            <div className="rounded-xl bg-white/80 p-3 dark:bg-neutral-900/80"><p className="text-xs text-gray-500">{lang === "es" ? "Resultado con costo registrado" : "Return with cost basis"}</p><p className={`mt-1 text-xl font-bold ${pnlPercent == null ? "text-gray-500" : pnlPercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{pnlPercent == null ? "—" : `${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(1)}%`}</p></div>
            <div className="rounded-xl bg-white/80 p-3 dark:bg-neutral-900/80"><p className="text-xs text-gray-500">{lang === "es" ? "Señales a revisar" : "Signals to review"}</p><p className={`mt-1 text-xl font-bold ${portfolioAlerts.length ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>{portfolioAlerts.length || (lang === "es" ? "Sin alertas" : "All clear")}</p></div>
          </div>
        )}
        {opportunity && opportunityScore != null && (
          <button onClick={() => onOpen(opportunity)} className="mt-3 flex w-full items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-sm hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70">
            <span>🔎</span><span className="flex-1"><b>{opportunity.symbol}</b> · {lang === "es" ? "Alta convicción y no está en tu cartera." : "High conviction and not in your portfolio."}</span><span className="font-mono text-emerald-700 dark:text-emerald-300">{opportunityScore.toFixed(2)}</span>
          </button>
        )}
        <div className="mt-3 rounded-xl border border-indigo-100 bg-white/70 p-3 dark:border-indigo-900/60 dark:bg-neutral-900/60">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-900 dark:text-indigo-200">{lang === "es" ? "Actividad reciente" : "Recent activity"}</p>
          <div className="space-y-2 text-sm">
            {firedAlert && (
              <div className="flex items-start gap-2"><span aria-hidden="true">🔔</span><span><b>{firedAlert.symbol}</b> · {lang === "es" ? "una alerta se activó" : "an alert was triggered"} <span className="text-xs text-gray-500">({new Date(firedAlert.triggered_at!).toLocaleDateString(lang === "es" ? "es-ES" : "en-US")})</span></span></div>
            )}
            {biggestWeeklyMove && (
              <div className="flex items-start gap-2"><span aria-hidden="true">⚡</span><span><b>{biggestWeeklyMove.symbol}</b> · {lang === "es" ? "movimiento en 7 sesiones:" : "move in 7 sessions:"} <span className={biggestWeeklyMove.change >= 0 ? "font-semibold text-emerald-700 dark:text-emerald-300" : "font-semibold text-red-700 dark:text-red-300"}>{biggestWeeklyMove.change >= 0 ? "+" : ""}{biggestWeeklyMove.change.toFixed(1)}%</span></span></div>
            )}
            {scoreMove && scoreMove.score_delta != null && (
              <button onClick={() => onOpen(scoreMove)} className="flex w-full items-start gap-2 text-left hover:underline"><span aria-hidden="true">📊</span><span><b>{scoreMove.symbol}</b> · {lang === "es" ? "cambio de score:" : "score change:"} <span className={scoreMove.score_delta >= 0 ? "font-semibold text-emerald-700 dark:text-emerald-300" : "font-semibold text-red-700 dark:text-red-300"}>{scoreMove.score_delta >= 0 ? "+" : ""}{scoreMove.score_delta.toFixed(3)}</span></span></button>
            )}
            {reviewsDue.length > 0 && <button onClick={() => setViewMode("favorites")} className="flex w-full items-start gap-2 text-left hover:underline"><span aria-hidden="true">🗓️</span><span>{lang === "es" ? `Tienes ${reviewsDue.length} ${reviewsDue.length === 1 ? "activo pendiente de revisión" : "activos pendientes de revisión"}: ` : `You have ${reviewsDue.length} ${reviewsDue.length === 1 ? "asset due for review" : "assets due for review"}: `}<b>{reviewsDue.slice(0, 3).join(", ")}</b>{reviewsDue.length > 3 ? "…" : ""}</span></button>}
            {!firedAlert && !biggestWeeklyMove && !scoreMove && reviewsDue.length === 0 && <p className="text-gray-500 dark:text-gray-400">{lang === "es" ? "Sin señales relevantes por ahora. Agrega activos a tu cartera o favoritos para personalizar este resumen." : "No material signals yet. Add holdings or favorites to personalize this summary."}</p>}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Top Ranking */}
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-emerald-50 dark:bg-emerald-950/40">
            <span className="font-semibold text-emerald-900 dark:text-emerald-300">{t("topRanking", lang)}</span>
            <button onClick={() => setViewMode("ranking")} className="text-xs text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded dark:text-emerald-300">
              {t("seeAll", lang)}
            </button>
          </div>
          <div className="divide-y">
            {rows.slice(0, 5).map((r) => (
              <button key={r.symbol} onClick={() => onOpen(r)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-150 text-left">
                <SymbolLogo symbol={r.symbol} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{r.symbol}</div>
                  <div className="text-xs text-gray-500 truncate">{r.name ?? "\u2014"}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono tabular-nums">{r.final_score?.toFixed(3) ?? "\u2014"}</div>
                  {r.bucket && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${bucketColor(r.bucket)}`}>
                      {bucketDisplay(r.bucket, lang)}
                    </span>
                  )}
                </div>
              </button>
            ))}
            {rows.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-400">{t("loadingBtn", lang)}</div>
            )}
          </div>
        </div>

        {/* Top Turnarounds */}
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-amber-50 dark:bg-amber-950/40">
            <span className="font-semibold text-amber-900 dark:text-amber-300">{t("topTurnarounds", lang)}</span>
            <button onClick={() => setViewMode("turnarounds")} className="text-xs text-amber-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded dark:text-amber-300">
              {t("seeAll", lang)}
            </button>
          </div>
          <div className="divide-y">
            {turnRows.slice(0, 5).map((r) => (
              <button key={r.symbol}
                onClick={() => onOpenFromSymbol(r.symbol, r.name, r.asset_type, r.racional_url, { mom_1m: r.mom_1m, mom_3m: r.mom_3m, liq_score: r.liq_score })}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-150 text-left">
                <SymbolLogo symbol={r.symbol} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{r.symbol}</div>
                  <div className="text-xs text-gray-500 truncate">{r.name ?? "\u2014"}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {r.rebound_from_low != null ? "\u2191" + (r.rebound_from_low * 100).toFixed(0) + "%" : "\u2014"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {r.mom_1m != null ? (r.mom_1m * 100).toFixed(1) + "% 1m" : "\u2014"}
                  </div>
                </div>
              </button>
            ))}
            {turnRows.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-400">{t("loadingBtn", lang)}</div>
            )}
          </div>
        </div>

        {/* Top Compounders */}
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-emerald-50 dark:bg-emerald-950/40">
            <span className="font-semibold text-emerald-900 dark:text-emerald-300">{t("topCompounders", lang)}</span>
            <button onClick={() => setViewMode("compounders")} className="text-xs text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded dark:text-emerald-300">
              {t("seeAll", lang)}
            </button>
          </div>
          <div className="divide-y">
            {filteredCompounders.slice(0, 5).map((r) => {
              const cagr = cmpHorizon === "1Y" ? r.cagr_1y : cmpHorizon === "3Y" ? r.cagr_3y : r.cagr_5y;
              return (
                <button key={r.symbol}
                  onClick={() => onOpenFromSymbol(r.symbol, r.name, r.asset_type, r.racional_url)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-150 text-left">
                  <SymbolLogo symbol={r.symbol} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{r.symbol}</div>
                    <div className="text-xs text-gray-500 truncate">{r.name ?? "\u2014"}</div>
                  </div>
                  <div className="text-right shrink-0">
                  <div className="text-sm font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {cagr != null ? (cagr * 100).toFixed(1) + "% CAGR" : "\u2014"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {r.pos_month_ratio != null ? (r.pos_month_ratio * 100).toFixed(0) + "% pos" : "\u2014"}
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredCompounders.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-400">{t("loadingBtn", lang)}</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
