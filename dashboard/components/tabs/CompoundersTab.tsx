"use client";
import { t } from "@/app/i18n";
import type { Lang, CompoundRow, RankRow } from "@/app/types";
import { InfoBox } from "@/components/ui/InfoBox";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { logoSrc } from "@/lib/stockUtils";

interface CompoundersTabProps {
  cmpHorizon: "1Y" | "3Y" | "5Y";
  setCmpHorizon: (v: "1Y" | "3Y" | "5Y") => void;
  cagrMin: number;
  setCagrMin: (v: number) => void;
  posMonthsMin: number;
  setPosMonthsMin: (v: number) => void;
  maxDDMax: number;
  setMaxDDMax: (v: number) => void;
  filteredCompounders: CompoundRow[];
  pagedCompounders: CompoundRow[];
  totalCmpPages: number;
  cmpPage: number;
  setCmpPage: (v: number | ((prev: number) => number)) => void;
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

export function CompoundersTab({
  cmpHorizon, setCmpHorizon,
  cagrMin, setCagrMin,
  posMonthsMin, setPosMonthsMin,
  maxDDMax, setMaxDDMax,
  filteredCompounders,
  pagedCompounders,
  totalCmpPages,
  cmpPage, setCmpPage,
  pageSize, setPageSize,
  lang,
  onOpenFromSymbol,
}: CompoundersTabProps) {
  return (
    <div className="animate-fadeIn">
      <InfoBox text={t("infoCompoundersText", lang)} label={t("infoHowItWorks", lang)} />
      {/* Controles */}
      <section className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{t("horizon", lang)}</span>
          <div className="inline-flex rounded-lg overflow-hidden border">
            {(["1Y", "3Y", "5Y"] as const).map((h) => (
              <button
                key={h}
                onClick={() => setCmpHorizon(h)}
                className={`px-3 py-1 text-sm ${cmpHorizon === h ? "bg-black text-white" : "bg-white hover:bg-gray-100"}`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 shrink-0">{t("cagrMin", lang)}</label>
          <input
            type="number" step="0.01" value={cagrMin}
            onChange={(e) => setCagrMin(parseFloat(e.target.value || "0"))}
            className="border rounded-lg px-2 py-1 text-sm w-20"
          />
          <span className="text-sm text-gray-500">({(cagrMin * 100).toFixed(0)}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 shrink-0">{t("posMonthsFilter", lang)}</label>
          <input
            type="number" step="0.01" value={posMonthsMin}
            onChange={(e) => setPosMonthsMin(parseFloat(e.target.value || "0"))}
            className="border rounded-lg px-2 py-1 text-sm w-20"
          />
          <span className="text-sm text-gray-500">({(posMonthsMin * 100).toFixed(0)}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 shrink-0">{t("maxDD", lang)}</label>
          <input
            type="number" step="0.01" value={maxDDMax}
            onChange={(e) => setMaxDDMax(parseFloat(e.target.value || "0"))}
            className="border rounded-lg px-2 py-1 text-sm w-20"
          />
          <span className="text-sm text-gray-500">({(maxDDMax * 100).toFixed(0)}%)</span>
        </div>
      </section>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-gray-500">{filteredCompounders.length} {t("results", lang)}</span>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setCmpPage(0); }}
          className="border rounded-lg px-2 py-1"
        >
          <option value={25}>{`25 / ${t("perPage", lang)}`}</option>
          <option value={50}>{`50 / ${t("perPage", lang)}`}</option>
          <option value={100}>{`100 / ${t("perPage", lang)}`}</option>
        </select>
      </div>

      {/* Tabla */}
      <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[560px] w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-3 py-2">{t("symbol", lang)}</th>
                <th className="px-3 py-2">{t("name", lang)}</th>
                <th className="px-3 py-2 text-right">CAGR</th>
                <th className="px-3 py-2 text-right">{t("posMonthsCol", lang)}</th>
                <th className="px-3 py-2 text-right">Max DD</th>
                <th className="px-3 py-2 text-right">{t("days", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {pagedCompounders.map((r) => {
                const cagr = cmpHorizon === "1Y" ? r.cagr_1y : cmpHorizon === "3Y" ? r.cagr_3y : r.cagr_5y;
                return (
                  <tr key={r.symbol} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => onOpenFromSymbol(r.symbol, r.name, r.asset_type, r.racional_url)}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                          <img src={logoSrc(r.symbol)} alt={r.symbol} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-semibold">{r.symbol}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">{r.name ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {cagr != null ? (cagr * 100).toFixed(1) + "%" : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.pos_month_ratio != null ? (r.pos_month_ratio * 100).toFixed(0) + "%" : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.max_drawdown != null ? (r.max_drawdown * 100).toFixed(0) + "%" : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.days_covered ?? "—"}</td>
                  </tr>
                );
              })}
              {pagedCompounders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                    {t("noResults", lang)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <PaginationBar
        lang={lang}
        page={cmpPage}
        total={totalCmpPages}
        onPrev={() => setCmpPage((p) => Math.max(0, p - 1))}
        onNext={() => setCmpPage((p) => Math.min(totalCmpPages - 1, p + 1))}
      />
    </div>
  );
}
