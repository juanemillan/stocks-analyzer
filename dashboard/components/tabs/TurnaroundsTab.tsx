"use client";
import { t } from "@/app/i18n";
import type { Lang, TurnRow, RankRow } from "@/app/types";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { InfoBox } from "@/components/ui/InfoBox";
import { logoSrc } from "@/lib/stockUtils";

interface TurnaroundsTabProps {
  turnRows: TurnRow[];
  pagedTurnRows: TurnRow[];
  totalTurnPages: number;
  turnPage: number;
  setTurnPage: (v: number | ((prev: number) => number)) => void;
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

export function TurnaroundsTab({
  turnRows,
  pagedTurnRows,
  totalTurnPages,
  turnPage,
  setTurnPage,
  pageSize,
  setPageSize,
  lang,
  onOpenFromSymbol,
}: TurnaroundsTabProps) {
  return (
    <div className="animate-fadeIn">
      <InfoBox text={t("infoTurnaroundsText", lang)} label={t("infoHowItWorks", lang)} />
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-gray-500">{turnRows.length} {t("candidates", lang)}</span>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setTurnPage(0); }}
          className="border rounded-lg px-2 py-1"
        >
          <option value={25}>{`25 / ${t("perPage", lang)}`}</option>
          <option value={50}>{`50 / ${t("perPage", lang)}`}</option>
          <option value={100}>{`100 / ${t("perPage", lang)}`}</option>
        </select>
      </div>
      <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[620px] w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-3 py-2">{t("symbol", lang)}</th>
                <th className="px-3 py-2">{t("name", lang)}</th>
                <th className="px-3 py-2">{t("type", lang)}</th>
                <th className="px-3 py-2 text-right">{t("rebound52w", lang)}</th>
                <th className="px-3 py-2 text-right">Mom 1m</th>
                <th className="px-3 py-2 text-right">Mom 3m</th>
                <th className="px-3 py-2 text-right">Vol surge</th>
              </tr>
            </thead>
            <tbody>
              {pagedTurnRows.map((tr) => (
                <tr
                  key={tr.symbol}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => onOpenFromSymbol(tr.symbol, tr.name, tr.asset_type, tr.racional_url, { mom_1m: tr.mom_1m, mom_3m: tr.mom_3m, liq_score: tr.liq_score })}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                        <img src={logoSrc(tr.symbol)} alt={tr.symbol} className="w-full h-full object-cover" />
                      </div>
                      <span className="font-semibold">{tr.symbol}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">{tr.name ?? "—"}</td>
                  <td className="px-3 py-2">{tr.asset_type ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tr.rebound_from_low != null ? (tr.rebound_from_low * 100).toFixed(0) + "%" : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tr.mom_1m != null ? (tr.mom_1m * 100).toFixed(1) + "%" : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tr.mom_3m != null ? (tr.mom_3m * 100).toFixed(1) + "%" : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tr.vol_surge != null ? tr.vol_surge.toFixed(2) + "×" : "—"}</td>
                </tr>
              ))}
              {pagedTurnRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
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
        page={turnPage}
        total={totalTurnPages}
        onPrev={() => setTurnPage((p) => Math.max(0, p - 1))}
        onNext={() => setTurnPage((p) => Math.min(totalTurnPages - 1, p + 1))}
      />
    </div>
  );
}
