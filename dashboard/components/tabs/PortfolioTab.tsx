"use client";
import { t } from "@/app/i18n";
import type { Lang, RankRow } from "@/app/types";
import { InfoBox } from "@/components/ui/InfoBox";
import { logoSrc, type Holding } from "@/lib/stockUtils";

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
}: PortfolioTabProps) {
  return (
    <div className="animate-fadeIn">
      <InfoBox text={t("infoPortfolioText", lang)} label={t("infoHowItWorks", lang)} />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">{t("tabPortfolio", lang)}</h2>
        <button
          onClick={onShowAddHolding}
          className="rounded-xl px-4 py-2 bg-black text-white text-sm hover:opacity-90"
        >
          {t("portAddHolding", lang)}
        </button>
      </div>

      {holdingsLoading ? (
        <div className="text-gray-500 text-sm py-8 text-center">{t("portLoading", lang)}</div>
      ) : holdings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-semibold text-gray-700">{t("portEmptyTitle", lang)}</p>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">{t("portEmptyDesc", lang)}</p>
          <button
            onClick={onShowAddHolding}
            className="mt-4 rounded-xl px-5 py-2 bg-black text-white text-sm hover:opacity-90"
          >
            {t("portAddHolding", lang)}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">{t("portSymbol", lang)}</th>
                <th className="px-4 py-3">{t("portShares", lang)}</th>
                <th className="px-4 py-3">{t("portAvgCost", lang)}</th>
                <th className="px-4 py-3">
                  <span>{t("portLastPrice", lang)}</span>
                  {dataDate && (
                    <span className="ml-1 normal-case font-normal text-gray-400">
                      ({dataDate})
                    </span>
                  )}
                </th>
                <th className="px-4 py-3">{t("portPnL", lang)}</th>
                <th className="px-4 py-3">{t("portMarketValue", lang)}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {holdings.map((h) => {
                const lp = latestPrices[h.symbol];
                const marketValue = lp ? lp.price * h.shares : null;
                const pnl =
                  lp && h.avg_cost != null
                    ? (lp.price - h.avg_cost) * h.shares
                    : null;
                const pnlPct =
                  lp && h.avg_cost != null && h.avg_cost > 0
                    ? ((lp.price - h.avg_cost) / h.avg_cost) * 100
                    : null;
                return (
                  <tr key={h.id} className="hover:bg-gray-50">
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
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{h.shares}</td>
                    <td className="px-4 py-3 tabular-nums">{h.avg_cost != null ? `$${h.avg_cost.toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {lp ? `$${lp.price.toFixed(2)}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {pnl != null ? (
                        <span className={pnl >= 0 ? "text-green-600" : "text-red-500"}>
                          {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}
                          {pnlPct != null && (
                            <span className="ml-1 text-xs opacity-70">
                              ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium">
                      {marketValue != null
                        ? `$${marketValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
