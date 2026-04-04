"use client";
import { useState, useMemo } from "react";
import { t } from "@/app/i18n";
import type { Lang, RankRow } from "@/app/types";
import { InfoBox } from "@/components/ui/InfoBox";
import { logoSrc, type Holding } from "@/lib/stockUtils";
import { CorrelationPanel } from "@/components/portfolio/CorrelationPanel";
import type { CorrelationResult } from "@/lib/correlation";

const INITIAL_VISIBLE = 8;

type SortKey = "symbol" | "shares" | "avg_cost" | "marketValue" | "pnl";
type SortDir = "asc" | "desc";

interface PortfolioTabProps {
  holdings: Holding[];
  holdingsLoading: boolean;
  latestPrices: Record<string, { price: number; date: string }>;
  dataDate: string | null;
  rows: RankRow[];
  lang: Lang;
  onShowAddHolding: () => void;
  onRemoveHolding: (id: string) => void;
  onOpen: (row: RankRow) => void;
  onOpenFromSymbol: (symbol: string) => void;
  correlationData: CorrelationResult | null;
  onShowConnectRacional: () => void;
  onShowRequestAsset: () => void;
  racionalSyncing: boolean;
  racionalSyncError: string | null;
  lastRacionalSync: Date | null;
}

export function PortfolioTab({
  holdings,
  holdingsLoading,
  latestPrices,
  dataDate,
  rows,
  lang,
  onShowAddHolding,
  onRemoveHolding,
  onOpen,
  onOpenFromSymbol,
  correlationData,
  onShowConnectRacional,
  onShowRequestAsset,
  racionalSyncing,
  racionalSyncError,
  lastRacionalSync,
}: PortfolioTabProps) {
  const [showAll, setShowAll] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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
    if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
    return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
  }), [enriched, sortKey, sortDir]);

  const visible = showAll ? sorted : sorted.slice(0, INITIAL_VISIBLE);
  const hasMore = sorted.length > INITIAL_VISIBLE;

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
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
      <InfoBox text={t("infoPortfolioText", lang)} label={t("infoHowItWorks", lang)} />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">{t("tabPortfolio", lang)}</h2>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Request asset */}
          <button
            onClick={onShowRequestAsset}
            title="Solicitar que se agregue un activo"
            className="flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            {t("portRequestAsset", lang)}
          </button>
          {/* Racional connect */}
          <button
            onClick={onShowConnectRacional}
            disabled={racionalSyncing}
            title={lastRacionalSync ? `Último sync: ${lastRacionalSync.toLocaleTimeString()}` : "Importar desde Racional"}
            className="flex items-center gap-1.5 rounded-2xl px-3 py-3 text-sm font-semibold text-black bg-[#18DAAE] hover:bg-[#13ab87] active:scale-95 disabled:opacity-60 transition-all duration-150"
          >
            {racionalSyncing ? (
              <svg className="w-3.5 h-3.5 animate-spin flex-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            )}
            <img
              src="https://app.racional.cl/assets/img/racional-black.svg"
              alt="Racional"
              className="h-3.5 w-auto"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span className="sr-only">Racional</span>
          </button>
          <button
            onClick={onShowAddHolding}
            className="rounded-xl px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm transition-colors duration-150"
          >
            {t("portAddHolding", lang)}
          </button>
        </div>
      </div>

      {racionalSyncError && (
        <p className="mb-3 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          {racionalSyncError}
        </p>
      )}

      {holdingsLoading ? (
        <div className="space-y-2 py-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-gray-100 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
      ) : holdings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
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
                        <div className="w-7 h-7 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                          <img src={logoSrc(h.symbol)} alt={h.symbol} className="w-full h-full object-cover" />
                        </div>
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
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{h.shares}</td>
                    <td className="px-4 py-3 tabular-nums">{h.avg_cost != null ? `$${h.avg_cost.toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {h.lp ? `$${h.lp.price.toFixed(2)}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {h.pnl != null ? (
                        <span className={h.pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>
                          {h.pnl >= 0 ? "+" : ""}{h.pnl.toFixed(2)}
                          {h.pnlPct != null && (
                            <span className="ml-1 text-xs opacity-70">
                              ({h.pnlPct >= 0 ? "+" : ""}{h.pnlPct.toFixed(1)}%)
                            </span>
                          )}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium">
                      {h.marketValue != null
                        ? `$${h.marketValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : <span className="text-gray-300">—</span>}
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

          {/* Ver más / Ver menos */}
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

      {correlationData && <CorrelationPanel data={correlationData} />}
    </div>
  );
}

