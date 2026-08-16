"use client";
import { useState, useMemo } from "react";
import { t } from "@/app/i18n";
import type { Lang, RankRow } from "@/app/types";
import { InfoBox } from "@/components/ui/InfoBox";
import type { Holding } from "@/lib/stockUtils";
import { SymbolLogo } from "@/components/ui/SymbolLogo";
import { CorrelationPanel } from "@/components/portfolio/CorrelationPanel";
import type { CorrelationResult } from "@/lib/correlation";
import { computeDiversificationScore } from "@/lib/correlation";
import { PortfolioPerformanceChart } from "@/components/portfolio/PortfolioPerformanceChart";
import { PortfolioDiagnosis } from "@/components/portfolio/PortfolioDiagnosis";
import type { PortfolioSnapshot } from "@/app/actions";

const INITIAL_VISIBLE = 8;

type SortKey = "symbol" | "shares" | "avg_cost" | "marketValue" | "pnl" | "pnlPct";
type SortDir = "asc" | "desc";

interface PortfolioTabProps {
  holdings: Holding[];
  holdingsLoading: boolean;
  loadError: string | null;
  latestPrices: Record<string, { price: number; date: string }>;
  dataDate: string | null;
  rows: RankRow[];
  lang: Lang;
  onShowAddHolding: () => void;
  onRetryLoad: () => void;
  onRemoveHolding: (id: string) => void;
  onOpen: (row: RankRow) => void;
  onOpenFromSymbol: (symbol: string) => void;
  correlationData: CorrelationResult | null;
  weekChanges: Record<string, number>;
  techSignals: Record<string, boolean>;
  onShowRequestAsset: () => void;
  onUpdateHolding: (id: string, shares: number, avg_cost: number | null) => Promise<void>;
  watchlist: Set<string>;
  onToggleWatchlist: (symbol: string) => void;
  snapshots: PortfolioSnapshot[];
}

export function PortfolioTab({
  holdings,
  holdingsLoading,
  loadError,
  latestPrices,
  dataDate,
  rows,
  lang,
  onShowAddHolding,
  onRetryLoad,
  onRemoveHolding,
  onOpen,
  onOpenFromSymbol,
  correlationData,
  weekChanges,
  techSignals,
  onShowRequestAsset,
  onUpdateHolding,
  watchlist,
  onToggleWatchlist,
  snapshots,
}: PortfolioTabProps) {
  const [showAll, setShowAll] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editShares, setEditShares] = useState("");
  const [editAvgCost, setEditAvgCost] = useState("");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  }

  const enriched = useMemo(() => holdings.map((h) => {
    const lp = latestPrices[h.symbol];
    const marketValue = lp ? lp.price * h.shares : null;
    const pnl = lp && h.avg_cost != null ? (lp.price - h.avg_cost) * h.shares : null;
    const pnlPct = lp && h.avg_cost != null && h.avg_cost > 0
      ? ((lp.price - h.avg_cost) / h.avg_cost) * 100 : null;
    return { ...h, lp, marketValue, pnl, pnlPct };
  }), [holdings, latestPrices]);

  const sorted = useMemo(() => [...enriched].sort((a, b) => {
    // Always push sold holdings to the bottom
    const aSold = !!a.sold_at, bSold = !!b.sold_at;
    if (aSold !== bSold) return aSold ? 1 : -1;

    let va: number | string = 0, vb: number | string = 0;
    if (sortKey === "symbol")      { va = a.symbol; vb = b.symbol; }
    else if (sortKey === "shares") { va = a.shares; vb = b.shares; }
    else if (sortKey === "avg_cost") { va = a.avg_cost ?? -Infinity; vb = b.avg_cost ?? -Infinity; }
    else if (sortKey === "marketValue") { va = a.marketValue ?? -Infinity; vb = b.marketValue ?? -Infinity; }
    else if (sortKey === "pnl")    { va = a.pnl ?? -Infinity; vb = b.pnl ?? -Infinity; }
    else if (sortKey === "pnlPct") { va = a.pnlPct ?? -Infinity; vb = b.pnlPct ?? -Infinity; }
    if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
    return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
  }), [enriched, sortKey, sortDir]);

  const visible = showAll ? sorted : sorted.slice(0, INITIAL_VISIBLE);
  const hasMore = sorted.length > INITIAL_VISIBLE;

  // Portfolio totals (active holdings only)
  const activeEnriched = enriched.filter((h) => !h.sold_at);
  const totalInvested = activeEnriched.reduce((s, h) => s + (h.avg_cost != null ? h.avg_cost * h.shares : 0), 0);
  const totalValue = activeEnriched.reduce((s, h) => s + (h.marketValue ?? 0), 0);
  const totalPnl = activeEnriched.reduce((s, h) => s + (h.pnl ?? 0), 0);
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : null;
  const divScore = correlationData ? computeDiversificationScore(correlationData) : null;

  function startEdit(h: typeof enriched[0]) {
    setEditingId(h.id);
    setEditShares(String(h.shares));
    setEditAvgCost(h.avg_cost != null ? String(h.avg_cost) : "");
  }

  async function saveEdit(id: string) {
    const s = parseFloat(editShares);
    if (isNaN(s) || s <= 0) return;
    await onUpdateHolding(id, s, editAvgCost ? parseFloat(editAvgCost) : null);
    setEditingId(null);
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 text-gray-300">⬍</span>;
    return <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>;
  }

  function ColHeader({ col, label }: { col: SortKey; label: string }) {
    return (
      <th
        className="px-4 py-3 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors whitespace-nowrap"
        onClick={() => handleSort(col)}
      >
        {label}<SortIcon col={col} />
      </th>
    );
  }

  return (
    <div className="animate-fadeIn">
      <InfoBox text={t("infoPortfolioText", lang)} label={t("infoHowItWorks", lang)}>
        <table className="mt-3 w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-blue-200 dark:border-blue-800">
              <th className="pb-1.5 pr-4 text-left font-semibold text-gray-500 dark:text-gray-400 w-12">{t("infoPortfolioColIcon", lang)}</th>
              <th className="pb-1.5 text-left font-semibold text-gray-500 dark:text-gray-400">{t("infoPortfolioColDesc", lang)}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-100 dark:divide-blue-900/40">
            <tr>
              <td className="py-2 pr-4">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>
                </span>
              </td>
              <td className="py-2">{t("infoPortfolioIconProfit", lang)}</td>
            </tr>
            <tr>
              <td className="py-2 pr-4">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                </span>
              </td>
              <td className="py-2">{t("infoPortfolioIconLoss", lang)}</td>
            </tr>
            <tr>
              <td className="py-2 pr-4">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-400">
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                </span>
              </td>
              <td className="py-2">{t("infoPortfolioIconUp", lang)}</td>
            </tr>
            <tr>
              <td className="py-2 pr-4">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400">
                  <svg className="w-3 h-3 rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                </span>
              </td>
              <td className="py-2">{t("infoPortfolioIconDown", lang)}</td>
            </tr>
          </tbody>
        </table>
      </InfoBox>
      <div className="mb-4">
        {/* Title row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{t("tabPortfolio", lang)}</h2>
            {/* Card / Table toggle */}
            <div className="flex rounded-lg border border-gray-200 dark:border-neutral-700 overflow-hidden">
              <button
                onClick={() => setViewMode("cards")}
                title="Vista tarjetas"
                className={`px-2 py-1.5 transition-colors ${viewMode === "cards" ? "bg-gray-100 dark:bg-neutral-700 text-gray-900 dark:text-white" : "text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800"}`}
              >
                <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              </button>
              <button
                onClick={() => setViewMode("table")}
                title="Vista tabla"
                className={`px-2 py-1.5 transition-colors ${viewMode === "table" ? "bg-gray-100 dark:bg-neutral-700 text-gray-900 dark:text-white" : "text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800"}`}
              >
                <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" /></svg>
              </button>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={onShowRequestAsset}
              title={lang === "es" ? "Solicitar que se agregue un activo" : "Request an asset"}
              aria-label={t("portRequestAsset", lang)}
              className="flex min-w-[84px] items-center justify-center gap-1 rounded-xl border border-gray-200 px-2.5 py-2 text-xs font-medium transition-colors hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              {lang === "es" ? "Solicitar" : "Request"}
            </button>
            <button
              onClick={onShowAddHolding}
              aria-label={t("portAddHolding", lang)}
              className="min-w-[84px] rounded-xl bg-emerald-500 px-2.5 py-2 text-xs font-medium text-white transition-colors duration-150 hover:bg-emerald-600"
            >
              {lang === "es" ? "Añadir" : "Add"}
            </button>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <span>{loadError}</span>
          <button onClick={onRetryLoad} className="shrink-0 rounded-lg border border-current px-2 py-1 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/30">{lang === "es" ? "Reintentar" : "Retry"}</button>
        </div>
      )}

      {/* ── Portfolio performance chart ── */}
      {snapshots.length > 1 && (
        <div className="mb-4">
          <PortfolioPerformanceChart snapshots={snapshots} lang={lang} />
        </div>
      )}

      {/* ── Portfolio summary bar ── */}
      {!holdingsLoading && holdings.length > 0 && (
        <div className="mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-gray-50 dark:bg-neutral-800 rounded-2xl px-3 py-2.5">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{lang === "es" ? "Invertido" : "Invested"}</p>
            <p className="text-sm font-semibold tabular-nums">${totalInvested.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-gray-50 dark:bg-neutral-800 rounded-2xl px-3 py-2.5">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{lang === "es" ? "Valor actual" : "Market value"}</p>
            <p className="text-sm font-semibold tabular-nums">${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-gray-50 dark:bg-neutral-800 rounded-2xl px-3 py-2.5">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">P&amp;L total</p>
            <p className={`text-sm font-semibold tabular-nums ${totalPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
              {totalPnl >= 0 ? "+" : ""}{totalPnl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {totalPnlPct != null && <span className="ml-1 text-xs font-normal">({totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(1)}%)</span>}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-neutral-800 rounded-2xl px-3 py-2.5">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{lang === "es" ? "Diversificación" : "Diversification"}</p>
            {divScore != null ? (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${divScore >= 70 ? "bg-emerald-500" : divScore >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${divScore}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold tabular-nums ${divScore >= 70 ? "text-emerald-600 dark:text-emerald-400" : divScore >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-500 dark:text-red-400"}`}>{divScore}</span>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">{lang === "es" ? "2+ activos" : "2+ holdings"}</p>
            )}
          </div>
        </div>
      )}

      {!holdingsLoading && holdings.length > 0 && (
        <PortfolioDiagnosis holdings={holdings} latestPrices={latestPrices} rows={rows} correlationData={correlationData} lang={lang} />
      )}

      {holdingsLoading ? (
        <div className="space-y-2 py-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-gray-100 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
      ) : holdings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <svg className="w-14 h-14 mb-4 text-gray-300 dark:text-neutral-600" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="8" y="16" width="48" height="36" rx="4" stroke="currentColor" strokeWidth="3" />
            <path d="M8 26h48" stroke="currentColor" strokeWidth="3" />
            <path d="M20 38h8M20 44h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <p className="font-semibold text-gray-700">{t("portEmptyTitle", lang)}</p>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">{t("portEmptyDesc", lang)}</p>
          <button
            onClick={onShowAddHolding}
            className="mt-4 rounded-xl px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm transition-colors duration-150"
          >
            {t("portAddHolding", lang)}
          </button>
        </div>
      ) : (
        <>
          {/* Sort pills — card mode only */}
          {viewMode === "cards" && (
            <div className="flex gap-2 overflow-x-auto pb-1 mb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {([
                { key: "pnlPct" as SortKey, label: "P&L %" },
                { key: "pnl" as SortKey, label: "P&L $" },
                { key: "marketValue" as SortKey, label: lang === "es" ? "Valor" : "Value" },
                { key: "symbol" as SortKey, label: "A→Z" },
                { key: "shares" as SortKey, label: lang === "es" ? "Acciones" : "Shares" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`flex-none flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    sortKey === key
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-700"
                  }`}
                >
                  {label}
                  {sortKey === key && <span>{sortDir === "asc" ? " ▲" : " ▼"}</span>}
                </button>
              ))}
            </div>
          )}

          {viewMode === "cards" ? (
            /* â”€â”€ Card view â”€â”€ */
            <div className="grid grid-cols-1 gap-2">
              {visible.map((h, idx) => (
                <div
                  key={h.id}
                  className={[
                    "rounded-2xl border px-4 py-3",
                    h.sold_at
                      ? "bg-amber-50/60 dark:bg-amber-900/10 opacity-70 border-amber-100 dark:border-amber-900/30"
                      : "bg-white dark:bg-neutral-900 border-gray-100 dark:border-neutral-800",
                    showAll && idx >= INITIAL_VISIBLE ? "animate-fadeIn-row" : "",
                  ].join(" ")}
                  style={showAll && idx >= INITIAL_VISIBLE ? { animationDelay: `${(idx - INITIAL_VISIBLE) * 35}ms` } : undefined}
                >
                  {/* Row 1: logo + symbol + tags | P&L% + delete */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <SymbolLogo symbol={h.symbol} size={32} />
                      <button
                        className="font-bold text-sm hover:underline flex-none"
                        onClick={() => {
                          const match = rows.find((r) => r.symbol === h.symbol);
                          if (match) onOpen(match);
                          else onOpenFromSymbol(h.symbol);
                        }}
                      >
                        {h.symbol}
                      </button>
                      {h.sold_at && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                          {t("portSold", lang)}
                        </span>
                      )}
                      {!h.sold_at && h.pnlPct != null && h.pnlPct >= 20 && techSignals[h.symbol] && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>
                        </span>
                      )}
                      {!h.sold_at && h.pnlPct != null && h.pnlPct <= -20 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                        </span>
                      )}
                      {!h.sold_at && weekChanges[h.symbol] != null && Math.abs(weekChanges[h.symbol]) >= 10 && (
                        weekChanges[h.symbol] > 0 ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-400">
                            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400">
                            <svg className="w-3 h-3 rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                          </span>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                      {h.pnlPct != null ? (
                        <span className={`text-sm font-bold tabular-nums ${h.pnlPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                          {h.pnlPct >= 0 ? "+" : ""}{h.pnlPct.toFixed(1)}%
                        </span>
                      ) : <span className="text-gray-300 text-sm">â€”</span>}
                      <button
                        onClick={() => onRemoveHolding(h.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors p-0.5"
                        aria-label="Delete"
                      >
                        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {/* Row 2: inline edit form or price details */}
                  {editingId === h.id ? (
                    <div className="mt-2 ml-10 flex items-center gap-2 flex-wrap">
                      <input
                        type="number"
                        value={editShares}
                        onChange={(e) => setEditShares(e.target.value)}
                        placeholder={lang === "es" ? "Acciones" : "Shares"}
                        className="w-24 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                      <input
                        type="number"
                        value={editAvgCost}
                        onChange={(e) => setEditAvgCost(e.target.value)}
                        placeholder={lang === "es" ? "Precio prom." : "Avg cost"}
                        className="w-28 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                      <button
                        onClick={() => saveEdit(h.id)}
                        className="rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 transition-colors"
                      >
                        {lang === "es" ? "Guardar" : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-gray-200 dark:border-neutral-700 text-xs px-2 py-1 text-gray-500 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                      >
                        {lang === "es" ? "Cancelar" : "Cancel"}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 ml-10 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                      {h.avg_cost != null && h.lp ? (
                        <span className="tabular-nums">${h.avg_cost.toFixed(2)} &rarr; <span className="text-gray-800 dark:text-gray-200 font-medium">${h.lp.price.toFixed(2)}</span></span>
                      ) : h.lp ? (
                        <span className="tabular-nums font-medium text-gray-800 dark:text-gray-200">${h.lp.price.toFixed(2)}</span>
                      ) : null}
                      <span className="text-gray-300 dark:text-neutral-600">&middot;</span>
                      <span>{h.shares.toLocaleString(lang === "es" ? "es-CL" : "en-US", { maximumFractionDigits: 4 })} {lang === "es" ? "acc." : "sh."}</span>
                      {h.marketValue != null && (
                        <>
                          <span className="text-gray-300 dark:text-neutral-600">&middot;</span>
                          <span className="font-medium text-gray-800 dark:text-gray-200 tabular-nums">
                            ${h.marketValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </>
                      )}
                      {h.pnl != null && (
                        <>
                          <span className="text-gray-300 dark:text-neutral-600">&middot;</span>
                          <span className={`tabular-nums ${h.pnl >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                            {h.pnl >= 0 ? "+" : ""}{h.pnl.toFixed(2)}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* â”€â”€ Table view â”€â”€ */
            <div className="overflow-x-auto rounded-2xl border">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-neutral-800/60 text-left text-xs text-gray-500 uppercase tracking-wide">
                    <ColHeader col="symbol" label={t("portSymbol", lang)} />
                    <ColHeader col="shares" label={t("portShares", lang)} />
                    <ColHeader col="avg_cost" label={t("portAvgCost", lang)} />
                    <th className="px-4 py-3 whitespace-nowrap">
                      {t("portLastPrice", lang)}
                      {dataDate && <span className="ml-1 normal-case font-normal text-gray-400">({dataDate})</span>}
                    </th>
                    <ColHeader col="pnlPct" label={t("portPnLPct", lang)} />
                    <ColHeader col="pnl" label={t("portPnL", lang)} />
                    <ColHeader col="marketValue" label={t("portMarketValue", lang)} />
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {visible.map((h, idx) => (
                    <tr
                      key={h.id}
                      className={[
                        h.sold_at
                          ? "bg-amber-50/60 dark:bg-amber-900/10 opacity-70"
                          : "hover:bg-gray-50 dark:hover:bg-neutral-800",
                        "transition-colors duration-150",
                        showAll && idx >= INITIAL_VISIBLE ? "animate-fadeIn-row" : "",
                      ].join(" ")}
                      style={showAll && idx >= INITIAL_VISIBLE ? { animationDelay: `${(idx - INITIAL_VISIBLE) * 35}ms` } : undefined}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <SymbolLogo symbol={h.symbol} size={28} />
                          <button
                            className="font-semibold hover:underline"
                            onClick={() => {
                              const match = rows.find((r) => r.symbol === h.symbol);
                              if (match) onOpen(match);
                              else onOpenFromSymbol(h.symbol);
                            }}
                          >
                            {h.symbol}
                          </button>
                          {h.sold_at && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                              {t("portSold", lang)}
                            </span>
                          )}
                          {!h.sold_at && h.pnlPct != null && h.pnlPct >= 20 && techSignals[h.symbol] && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" title={lang === "es" ? "Sobrecomprado tÃ©cnicamente" : "Technically overbought"}>
                              <svg className="w-3 h-3 flex-none" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                          {!h.sold_at && h.pnlPct != null && h.pnlPct <= -20 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                              <svg className="w-3 h-3 flex-none" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                          {!h.sold_at && weekChanges[h.symbol] != null && Math.abs(weekChanges[h.symbol]) >= 10 && (
                            weekChanges[h.symbol] > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-400">
                                <svg className="w-3 h-3 flex-none" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                </svg>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400">
                                <svg className="w-3 h-3 flex-none rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                </svg>
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{h.shares}</td>
                      <td className="px-4 py-3 tabular-nums">{h.avg_cost != null ? `$${h.avg_cost.toFixed(2)}` : "â€”"}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {h.lp ? `$${h.lp.price.toFixed(2)}` : <span className="text-gray-300">â€”</span>}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium">
                        {h.pnlPct != null ? (
                          <span className={h.pnlPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>
                            {h.pnlPct >= 0 ? "+" : ""}{h.pnlPct.toFixed(1)}%
                          </span>
                        ) : <span className="text-gray-300">â€”</span>}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {h.pnl != null ? (
                          <span className={h.pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>
                            {h.pnl >= 0 ? "+" : ""}{h.pnl.toFixed(2)}
                          </span>
                        ) : <span className="text-gray-300">â€”</span>}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium">
                        {h.marketValue != null
                          ? `$${h.marketValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : <span className="text-gray-300">â€”</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onRemoveHolding(h.id)}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50"
                        >
                          {t("portDelete", lang)}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Ver mÃ¡s / Ver menos */}
          {hasMore && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-3 w-full rounded-xl border border-gray-200 dark:border-neutral-700 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
            >
              {showAll
                ? `${t("portCollapse", lang)}`
                : `${t("portShowAll", lang)} (${sorted.length})`}
            </button>
          )}
        </>
      )}

      {correlationData && <CorrelationPanel data={correlationData} lang={lang} />}

      {/* ── Gaps: high-scoring assets NOT in portfolio ── */}
      {(() => {
        const portfolioSymbols = new Set(holdings.map((h) => h.symbol));
        const gaps = rows
          .filter((r) => !portfolioSymbols.has(r.symbol) && r.final_score != null && r.final_score >= 0.65)
          .slice(0, 5);
        if (gaps.length === 0) return null;
        return (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {lang === "es" ? "🔍 Oportunidades que no tienes" : "🔍 Gaps in your portfolio"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {lang === "es"
                ? "Activos con puntuación alta que no están en tu cartera."
                : "High-scoring assets you don't currently hold."}
            </p>
            <div className="flex flex-col gap-2">
              {gaps.map((r) => (
                <button
                  key={r.symbol}
                  className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-neutral-900 border dark:border-neutral-700 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-left"
                  onClick={() => onOpen(r)}
                >
                  <SymbolLogo symbol={r.symbol} size={32} />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm">{r.symbol}</span>
                    {r.name && <span className="ml-2 text-xs text-gray-500 truncate">{r.name}</span>}
                  </div>
                  <div className="flex-none text-right">
                    <span className={`text-sm font-bold tabular-nums ${(r.final_score ?? 0) >= 0.7 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {((r.final_score ?? 0) * 100).toFixed(0)}
                    </span>
                    <span className="text-xs text-gray-400 ml-0.5">/100</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
