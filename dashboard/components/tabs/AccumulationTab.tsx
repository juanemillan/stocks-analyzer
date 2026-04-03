"use client";
import { t } from "@/app/i18n";
import type { Lang, AccumRow, RankRow } from "@/app/types";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { logoSrc } from "@/lib/stockUtils";

interface AccumulationTabProps {
  accumRows: AccumRow[];
  pagedAccumRows: AccumRow[];
  totalAccumPages: number;
  accumPage: number;
  setAccumPage: (v: number | ((prev: number) => number)) => void;
  pageSize: number;
  setPageSize: (v: number) => void;
  lang: Lang;
  onOpenFromSymbol: (
    symbol: string,
    name?: string | null,
    asset_type?: string | null,
    racional_url?: string | null,
    extras?: Partial<RankRow>,
  ) => void;
}

export function AccumulationTab({
  accumRows,
  pagedAccumRows,
  totalAccumPages,
  accumPage,
  setAccumPage,
  pageSize,
  setPageSize,
  lang,
  onOpenFromSymbol,
}: AccumulationTabProps) {
  return (
    <div className="animate-fadeIn">
      <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-700/40 dark:text-amber-300">
        {lang === "es"
          ? "Candidatos en zona de acumulación: caídas ≥40% desde máximos, aún cerca del mínimo 52s (0–50% sobre él), con primeros signos de vida (momentum y volumen)."
          : "Accumulation zone candidates: fallen ≥40% from highs, still near 52w low (0–50% above it), with first signs of life (momentum & volume surge)."}
      </div>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-gray-500">{accumRows.length} {t("candidates", lang)}</span>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setAccumPage(0); }}
          className="border rounded-lg px-2 pr-5 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value={25}>{`25 / ${t("perPage", lang)}`}</option>
          <option value={50}>{`50 / ${t("perPage", lang)}`}</option>
          <option value={100}>{`100 / ${t("perPage", lang)}`}</option>
        </select>
      </div>
      <section className="bg-white border rounded-2xl shadow-sm overflow-hidden dark:bg-neutral-900 dark:border-neutral-700">
        <div className="overflow-x-auto">
          <table className="min-w-[700px] w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300">
              <tr>
                <th className="px-3 py-2">{t("symbol", lang)}</th>
                <th className="px-3 py-2">{t("name", lang)}</th>
                <th className="px-3 py-2">{t("type", lang)}</th>
                <th className="px-3 py-2 text-right">{lang === "es" ? "% sobre mín 52s" : "% above 52w low"}</th>
                <th className="px-3 py-2 text-right">{lang === "es" ? "Caída desde máx" : "From 52w high"}</th>
                <th className="px-3 py-2 text-right">Mom 1w</th>
                <th className="px-3 py-2 text-right">Mom 1m</th>
                <th className="px-3 py-2 text-right">Vol surge</th>
              </tr>
            </thead>
            <tbody>
              {pagedAccumRows.map((ar) => (
                <tr
                  key={ar.symbol}
                  className="border-t hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-150 cursor-pointer"
                  onClick={() => onOpenFromSymbol(ar.symbol, ar.name, ar.asset_type, ar.racional_url, { mom_1m: ar.mom_1m, mom_3m: ar.mom_3m, liq_score: ar.liq_score })}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                        <img src={logoSrc(ar.symbol)} alt={ar.symbol} className="w-full h-full object-cover" />
                      </div>
                      <span className="font-semibold">{ar.symbol}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400 max-w-[180px] truncate">{ar.name ?? "—"}</td>
                  <td className="px-3 py-2">{ar.asset_type ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber-600 dark:text-amber-400">
                    {ar.pct_above_52w_low != null ? "+" + (ar.pct_above_52w_low * 100).toFixed(1) + "%" : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-500 dark:text-red-400">
                    {ar.pct_from_52w_high != null ? (ar.pct_from_52w_high * 100).toFixed(1) + "%" : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {ar.mom_1w != null
                      ? <span className={ar.mom_1w >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>{(ar.mom_1w * 100).toFixed(1)}%</span>
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {ar.mom_1m != null
                      ? <span className={ar.mom_1m >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>{(ar.mom_1m * 100).toFixed(1)}%</span>
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{ar.vol_surge != null ? ar.vol_surge.toFixed(2) + "×" : "—"}</td>
                </tr>
              ))}
              {pagedAccumRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                    {t("noCandidates", lang)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <PaginationBar
        lang={lang}
        page={accumPage}
        total={totalAccumPages}
        onPrev={() => setAccumPage((p) => Math.max(0, p - 1))}
        onNext={() => setAccumPage((p) => Math.min(totalAccumPages - 1, p + 1))}
      />
    </div>
  );
}
