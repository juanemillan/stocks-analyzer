"use client";

import React, { useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { FundStat } from "@/components/ui/FundStat";
import { MomStat } from "@/components/ui/MomStat";
import { DescriptionBlock } from "@/components/ui/DescriptionBlock";
import { logoSrc, bucketDisplay, fmtBig, RANGE_OPTIONS } from "@/lib/stockUtils";
import { t } from "@/app/i18n";
import type { RankRow, PriceRow, Lang, FinnhubData } from "@/app/types";

type Props = {
  open: boolean;
  onClose: () => void;
  selected: RankRow | null;
  finnhubData: FinnhubData | null;
  finnhubLoading: boolean;
  prices: PriceRow[];
  pricesLoading: boolean;
  rangeKey: string;
  setRangeKey: (k: string) => void;
  lang: Lang;
};

export function StockDetailPanel({
  open,
  onClose,
  selected,
  finnhubData,
  finnhubLoading,
  prices,
  pricesLoading,
  rangeKey,
  setRangeKey,
  lang,
}: Props) {
  // ESC key closes modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open || !selected) return null;

  const RangeButtons = () => (
    <div className="flex gap-1 flex-wrap">
      {RANGE_OPTIONS.map((r) => (
        <button
          key={r.key}
          onClick={() => setRangeKey(r.key)}
          className={`px-2 py-1 text-xs rounded-lg border transition-colors duration-200 ${
            rangeKey === r.key
              ? "bg-emerald-500 text-white dark:bg-emerald-600 border-emerald-500 dark:border-emerald-600"
              : "bg-white hover:bg-gray-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-gray-300 dark:border-neutral-600"
          }`}
        >
          {r.key}
        </button>
      ))}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-backdropIn" onClick={onClose} />

      {/* Panel: bottom-sheet on mobile, centered dialog on sm+ */}
      <div className="relative w-full sm:max-w-5xl max-h-[90svh] flex flex-col bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slideUp">

        {/* ── Sticky header ── */}
        <div className="flex-none flex items-center gap-3 px-5 py-4 border-b dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <div className="w-10 h-10 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
            <img src={logoSrc(selected.symbol)} alt={selected.symbol} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold leading-tight truncate">
              {selected.symbol} — {selected.name ?? "—"}
            </h2>
            {finnhubData?.quote && (
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-lg font-bold tabular-nums">{finnhubData.quote.c.toFixed(2)}</span>
                <span className={`text-sm font-medium ${finnhubData.quote.dp >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {finnhubData.quote.dp >= 0 ? "+" : ""}{finnhubData.quote.dp.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
          {/* Range buttons — hidden on mobile (shown below header) */}
          <div className="hidden sm:flex gap-1 flex-wrap">
            <RangeButtons />
          </div>
          <button
            onClick={onClose}
            className="flex-none w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Range buttons row on mobile */}
        <div className="flex sm:hidden gap-1 flex-wrap px-5 py-2 border-b dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <RangeButtons />
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* ── LEFT: chart + fundamentals ── */}
            <div className="lg:col-span-2 flex flex-col gap-4">

              {/* Chart */}
              <div className="bg-gray-50 dark:bg-neutral-800 rounded-2xl p-4">
                <div className="h-52 md:h-64">
                  {pricesLoading ? (
                    <div className="h-full flex items-center justify-center text-gray-500">{t("loadingPrices", lang)}</div>
                  ) : prices.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={prices} margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={28} tickMargin={6} />
                        <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} width={60} tickMargin={4} />
                        <Tooltip
                          contentStyle={{ fontSize: "12px", borderRadius: "8px", padding: "6px 10px" }}
                          formatter={(v: any) => Number(v).toFixed(2)}
                        />
                        <Line type="monotone" dataKey="close" dot={false} strokeWidth={2} stroke="#10b981" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">{t("noPriceData", lang)}</div>
                  )}
                </div>
              </div>

              {/* Fundamentals + Consensus + Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Fundamentals */}
                <div className="bg-white border rounded-2xl p-4 dark:bg-neutral-900 dark:border-neutral-700">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t("fundamentals", lang)}</div>
                  {finnhubLoading ? (
                    <div className="text-xs text-gray-400 animate-pulse">{t("loadingBtn", lang)}</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {finnhubData?.quote && (<>
                        <FundStat label={t("prevClose", lang)} value={finnhubData.quote.pc.toFixed(2)} />
                        <FundStat label={t("dayOpen", lang)} value={finnhubData.quote.o.toFixed(2)} />
                        <FundStat label={t("dayHigh", lang)} value={finnhubData.quote.h.toFixed(2)} highlight="up" />
                        <FundStat label={t("dayLow", lang)} value={finnhubData.quote.l.toFixed(2)} highlight="down" />
                      </>)}
                      {finnhubData?.metrics && (<>
                        <FundStat label={t("week52High", lang)} value={finnhubData.metrics["52WeekHigh"] != null ? String(finnhubData.metrics["52WeekHigh"]!.toFixed(2)) : "—"} />
                        <FundStat label={t("week52Low", lang)} value={finnhubData.metrics["52WeekLow"] != null ? String(finnhubData.metrics["52WeekLow"]!.toFixed(2)) : "—"} />
                        <FundStat label={t("marketCap", lang)} value={finnhubData.metrics.marketCapitalization != null ? fmtBig(finnhubData.metrics.marketCapitalization) : "—"} />
                        <FundStat label={t("peRatio", lang)} value={finnhubData.metrics.peBasicExclExtraTTM != null ? finnhubData.metrics.peBasicExclExtraTTM.toFixed(1) : "—"} />
                        <FundStat label={t("ebitda", lang)} value={finnhubData.metrics.ebitdaAnnual != null ? fmtBig(finnhubData.metrics.ebitdaAnnual) : "—"} />
                        <FundStat label={t("eps", lang)} value={finnhubData.metrics.epsBasicExclExtraItemsTTM != null ? finnhubData.metrics.epsBasicExclExtraItemsTTM.toFixed(2) : "—"} />
                        <FundStat label={t("divYield", lang)} value={finnhubData.metrics.dividendYieldIndicatedAnnual != null ? finnhubData.metrics.dividendYieldIndicatedAnnual.toFixed(2) + "%" : "—"} />
                        <FundStat label={t("revenueGrowth", lang)} value={finnhubData.metrics.revenueGrowthTTMYoy != null ? finnhubData.metrics.revenueGrowthTTMYoy.toFixed(1) + "%" : "—"} />
                      </>)}
                    </div>
                  )}
                </div>

                {/* Analyst Consensus + Description stacked */}
                <div className="flex flex-col gap-4">

                  {/* Analyst Consensus */}
                  <div className="bg-white border rounded-2xl p-4 dark:bg-neutral-900 dark:border-neutral-700">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t("analystConsensus", lang)}</div>
                    {finnhubLoading ? (
                      <div className="text-xs text-gray-400 animate-pulse">{t("loadingBtn", lang)}</div>
                    ) : finnhubData?.recommendation ? (
                      (() => {
                        const r = finnhubData.recommendation;
                        const slices = [
                          { name: t("strongBuy", lang),  value: r.strongBuy,  color: "#10b981" },
                          { name: "Buy",                  value: r.buy,        color: "#4ade80" },
                          { name: "Hold",                 value: r.hold,       color: "#fde047" },
                          { name: "Sell",                 value: r.sell,       color: "#f87171" },
                          { name: t("strongSell", lang),  value: r.strongSell, color: "#ef4444" },
                        ].filter((s) => s.value > 0);
                        const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
                        return (
                          <div className="flex items-start gap-3">
                            <div className="flex-none" style={{ width: 120, height: 120 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie data={slices} cx="50%" cy="50%" innerRadius={35} outerRadius={54} dataKey="value" paddingAngle={2}>
                                    {slices.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                  </Pie>
                                  <Tooltip
                                    contentStyle={{ fontSize: "12px", borderRadius: "8px", padding: "4px 10px" }}
                                    formatter={(v: any, name: any) => [`${v} (${((v / total) * 100).toFixed(0)}%)`, name]}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col gap-1.5 text-xs">
                              {slices.map((s, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full flex-none" style={{ backgroundColor: s.color }} />
                                  <span className="flex-1 min-w-0 truncate text-gray-600 dark:text-gray-400">{s.name}</span>
                                  <span className="font-semibold tabular-nums w-5 text-right">{s.value}</span>
                                  <span className="text-gray-400 w-8 text-right tabular-nums">{((s.value / total) * 100).toFixed(0)}%</span>
                                </div>
                              ))}
                              <div className="text-gray-400 mt-1 text-xs">{r.period}</div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-xs text-gray-400">—</div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="bg-white border rounded-2xl p-4 dark:bg-neutral-900 dark:border-neutral-700">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("companyDescription", lang)}</div>
                    {selected.description
                      ? <DescriptionBlock text={selected.description} lang={lang} />
                      : <p className="text-xs text-gray-400 italic">{lang === "es" ? "Sin descripción disponible" : "No description available"}</p>
                    }
                  </div>

                </div>
              </div>
            </div>

            {/* ── RIGHT: signals panel ── */}
            <div className="flex flex-col gap-4">

              {/* Links + metadata */}
              <div className="bg-white border rounded-2xl p-4 dark:bg-neutral-900 dark:border-neutral-700">
                <div className="flex flex-wrap gap-1.5">
                  <a href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(selected.symbol)}`} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1 rounded-lg bg-white border text-xs hover:bg-gray-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-600">
                    {t("viewInTradingView", lang)}
                  </a>
                  {selected.racional_url && (
                    <a href={selected.racional_url} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1 rounded-lg bg-white border text-xs hover:bg-gray-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-600">
                      {t("viewInRacional", lang)}
                    </a>
                  )}
                </div>
                {(selected.sector || selected.industry || selected.website) && (
                  <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                    {(selected.sector || selected.industry) && (
                      <div>{[selected.sector, selected.industry].filter(Boolean).join(" · ")}</div>
                    )}
                    {selected.website && (
                      <a href={selected.website.startsWith("http") ? selected.website : `https://${selected.website}`} target="_blank"
                        className="text-blue-600 hover:underline dark:text-blue-400">
                        {selected.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Momentum & technicals */}
              <div className="bg-white border rounded-2xl p-4 dark:bg-neutral-900 dark:border-neutral-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("momentum", lang)}</div>
                  <div className="flex items-center gap-2">
                    {selected.bucket && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        selected.bucket === "Alta Convicción" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : selected.bucket === "Vigilancia" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                      }`}>{bucketDisplay(selected.bucket, lang)}</span>
                    )}
                    {selected.final_score != null && (
                      <span className="text-xs font-bold tabular-nums">{selected.final_score.toFixed(3)}</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <MomStat label="Mom 1w" value={selected.mom_1w} />
                  <MomStat label="Mom 1m" value={selected.mom_1m} />
                  <MomStat label="Mom 3m" value={selected.mom_3m} />
                  <MomStat label="Mom 6m" value={selected.mom_6m} />
                  <MomStat label="Mom 1y" value={selected.mom_1y} />
                  <MomStat label="RS vs SPY" value={selected.rs_spy} />
                  <div className="col-span-2 border-t mt-1 pt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                    <div><span className="text-gray-500">{t("liquidity", lang)}: </span><span className="font-medium">{selected.liq_score?.toFixed(2) ?? "—"}</span></div>
                    <div><span className="text-gray-500">{t("trend", lang)}: </span><span className="font-medium">{selected.tech_trend?.toFixed(2) ?? "—"}</span></div>
                  </div>
                </div>
              </div>

              {/* Latest news */}
              <div className="bg-white border rounded-2xl p-4 dark:bg-neutral-900 dark:border-neutral-700">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("latestNews", lang)}</div>
                {finnhubLoading ? (
                  <div className="text-xs text-gray-400 animate-pulse">{t("loadingBtn", lang)}</div>
                ) : finnhubData?.news && finnhubData.news.length > 0 ? (
                  <ul className="space-y-3">
                    {finnhubData.news.map((item, i) => (
                      <li key={i} className="border-b last:border-0 pb-2 last:pb-0">
                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline line-clamp-2 leading-snug dark:text-blue-400">
                          {item.headline}
                        </a>
                        <div className="text-xs text-gray-400 mt-0.5">{item.source} · {new Date(item.datetime * 1000).toLocaleDateString()}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-gray-400">—</div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
