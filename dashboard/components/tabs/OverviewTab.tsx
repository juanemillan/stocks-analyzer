"use client";
import { t } from "@/app/i18n";
import type { Lang, RankRow, TurnRow, CompoundRow } from "@/app/types";
import { InfoBox } from "@/components/ui/InfoBox";
import { logoSrc, bucketColor, bucketDisplay } from "@/lib/stockUtils";

interface OverviewTabProps {
  rows: RankRow[];
  turnRows: TurnRow[];
  filteredCompounders: CompoundRow[];
  cmpHorizon: "1Y" | "3Y" | "5Y";
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
}

export function OverviewTab({
  rows,
  turnRows,
  filteredCompounders,
  cmpHorizon,
  lang,
  setViewMode,
  onOpen,
  onOpenFromSymbol,
}: OverviewTabProps) {
  return (
    <div className="animate-fadeIn">
      <InfoBox text={t("infoOverviewText", lang)} label={t("infoHowItWorks", lang)} />
      <div className="mb-4">
        <h2 className="text-lg font-bold">{t("tabOverview", lang)}</h2>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString(lang === "es" ? "es-ES" : "en-US", { dateStyle: "long" })}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Top Ranking */}
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-emerald-50 dark:bg-emerald-950/40">
            <span className="font-semibold text-emerald-900 dark:text-emerald-300">{t("topRanking", lang)}</span>
            <button onClick={() => setViewMode("ranking")} className="text-xs text-emerald-600 hover:underline">
              {t("seeAll", lang)}
            </button>
          </div>
          <div className="divide-y">
            {rows.slice(0, 5).map((r) => (
              <button key={r.symbol} onClick={() => onOpen(r)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-150 text-left">
                <div className="w-7 h-7 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                  <img src={logoSrc(r.symbol)} alt={r.symbol} className="w-full h-full object-cover" />
                </div>
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
            <button onClick={() => setViewMode("turnarounds")} className="text-xs text-amber-600 hover:underline">
              {t("seeAll", lang)}
            </button>
          </div>
          <div className="divide-y">
            {turnRows.slice(0, 5).map((r) => (
              <button key={r.symbol}
                onClick={() => onOpenFromSymbol(r.symbol, r.name, r.asset_type, r.racional_url, { mom_1m: r.mom_1m, mom_3m: r.mom_3m, liq_score: r.liq_score })}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-150 text-left">
                <div className="w-7 h-7 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                  <img src={logoSrc(r.symbol)} alt={r.symbol} className="w-full h-full object-cover" />
                </div>
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
            <button onClick={() => setViewMode("compounders")} className="text-xs text-emerald-600 hover:underline">
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
                  <div className="w-7 h-7 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                    <img src={logoSrc(r.symbol)} alt={r.symbol} className="w-full h-full object-cover" />
                  </div>
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
