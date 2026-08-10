"use client";
import { t } from "@/app/i18n";
import type { Lang, RankRow, TurnRow, CompoundRow } from "@/app/types";
import { InfoBox } from "@/components/ui/InfoBox";
import { bucketColor, bucketDisplay } from "@/lib/stockUtils";
import { SymbolLogo } from "@/components/ui/SymbolLogo";
import type { Holding } from "@/lib/stockUtils";

interface OverviewTabProps {
  rows: RankRow[];
  turnRows: TurnRow[];
  filteredCompounders: CompoundRow[];
  cmpHorizon: "1Y" | "3Y" | "5Y";
  holdings: Holding[];
  latestPrices: Record<string, { price: number; date: string }>;
  weekChanges: Record<string, number>;
  techSignals: Record<string, boolean>;
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
  turnRows,
  filteredCompounders,
  cmpHorizon,
  holdings,
  latestPrices,
  weekChanges,
  techSignals,
  lang,
  setViewMode,
  onOpen,
  onOpenFromSymbol,
  onAskFollowUp,
}: OverviewTabProps) {
  const marketDate = rows.find((row) => row.date)?.date;
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
      </div>

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
