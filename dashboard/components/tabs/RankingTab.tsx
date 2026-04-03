"use client";
import { t } from "@/app/i18n";
import type { Lang, RankRow } from "@/app/types";
import { InfoBox } from "@/components/ui/InfoBox";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { BUCKETS, TYPES, logoSrc, bucketDisplay } from "@/lib/stockUtils";

interface RankingTabProps {
  rows: RankRow[];
  q: string;
  setQ: (v: string) => void;
  bucket: string;
  setBucket: (v: string) => void;
  atype: string;
  setAtype: (v: string) => void;
  minScore: number;
  setMinScore: (v: number) => void;
  sortKey: keyof RankRow;
  setSortKey: (v: keyof RankRow) => void;
  sortDir: "asc" | "desc";
  setSortDir: (v: "asc" | "desc") => void;
  filteredRanking: RankRow[];
  pagedRanking: RankRow[];
  totalPages: number;
  page: number;
  setPage: (v: number | ((prev: number) => number)) => void;
  pageSize: number;
  setPageSize: (v: number) => void;
  lang: Lang;
  selectedSymbol?: string | null;
  onOpen: (row: RankRow) => void;
}

export function RankingTab({
  rows,
  q, setQ,
  bucket, setBucket,
  atype, setAtype,
  minScore, setMinScore,
  sortKey, setSortKey,
  sortDir, setSortDir,
  filteredRanking,
  pagedRanking,
  totalPages,
  page, setPage,
  pageSize, setPageSize,
  lang,
  selectedSymbol,
  onOpen,
}: RankingTabProps) {
  return (
    <div className="animate-fadeIn">
      <InfoBox text={t("infoRankingText", lang)} label={t("infoHowItWorks", lang)} />
      <section className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          placeholder={t("searchPlaceholder", lang)}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border rounded-xl px-3 py-2 text-sm md:col-span-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <div className="grid grid-cols-2 gap-3 md:contents">
        <select value={bucket} onChange={(e) => setBucket(e.target.value)} className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">{t("bucketAll", lang)}</option>
          {BUCKETS.map((b) => (
            <option key={b} value={b}>
              {bucketDisplay(b, lang)}
            </option>
          ))}
        </select>
        <select value={atype} onChange={(e) => setAtype(e.target.value)} className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">{t("typeAll", lang)}</option>
          {TYPES.map((tp) => (
            <option key={tp} value={tp}>
              {tp}
            </option>
          ))}
        </select>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm w-20">{t("minScore", lang)}</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={minScore}
            onChange={(e) => setMinScore(parseFloat(e.target.value))}
            className="w-full"
          />
          <span className="text-sm tabular-nums w-12 text-right">{minScore.toFixed(2)}</span>
        </div>
      </section>

      <section className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
        <span className="text-gray-600">{t("sortBy", lang)}</span>
        <select
          value={String(sortKey)}
          onChange={(e) => setSortKey(e.target.value as keyof RankRow)}
          className="border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="final_score">Score</option>
          <option value="mom_1m">Mom 1m</option>
          <option value="mom_1w">Mom 1w</option>
          <option value="mom_3m">Mom 3m</option>
          <option value="rs_spy">RS vs SPY</option>
          <option value="liq_score">{t("liquidity", lang)}</option>
        </select>
        <select value={sortDir} onChange={(e) => setSortDir(e.target.value as "asc" | "desc")} className="border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
        <span className="ml-auto text-gray-500">{filteredRanking.length} {t("results", lang)}</span>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
          className="border rounded-lg px-2 pr-5 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value={25}>{`25 / ${t("perPage", lang)}`}</option>
          <option value={50}>{`50 / ${t("perPage", lang)}`}</option>
          <option value={100}>{`100 / ${t("perPage", lang)}`}</option>
        </select>
      </section>

      <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-3 py-2">{t("symbol", lang)}</th>
                <th className="px-3 py-2">{t("name", lang)}</th>
                <th className="px-3 py-2">{t("type", lang)}</th>
                <th className="px-3 py-2 text-right">Score</th>
                <th className="px-3 py-2 text-right">Mom 1m</th>
                <th className="px-3 py-2 text-right">Mom 3m</th>
                <th className="px-3 py-2 text-right">Mom 6m</th>
                <th className="px-3 py-2 text-right">Mom 1y</th>
                <th className="px-3 py-2 text-right">RS vs SPY</th>
                <th className="px-3 py-2 text-right">{t("liquidity", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {pagedRanking.map((r) => (
                <tr key={r.symbol} className={`border-t transition-colors duration-150 cursor-pointer ${r.symbol === selectedSymbol ? "bg-emerald-50 dark:bg-emerald-900/10 border-l-2 border-l-emerald-500" : "hover:bg-gray-50 dark:hover:bg-neutral-800"}`} onClick={() => onOpen(r)}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                        <img src={logoSrc(r.symbol)} alt={r.symbol} className="w-full h-full object-cover" />
                      </div>
                      <span className="font-semibold">{r.symbol}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">{r.name ?? "—"}</td>
                  <td className="px-3 py-2">{r.asset_type ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.final_score != null
                      ? <span className={r.final_score >= 0.7 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : r.final_score < 0.35 ? "text-red-500 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}>{r.final_score.toFixed(3)}</span>
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.mom_1m != null ? <span className={r.mom_1m >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>{(r.mom_1m * 100).toFixed(2)}%</span> : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.mom_3m != null ? <span className={r.mom_3m >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>{(r.mom_3m * 100).toFixed(2)}%</span> : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.mom_6m != null ? <span className={r.mom_6m >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>{(r.mom_6m * 100).toFixed(2)}%</span> : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.mom_1y != null ? <span className={r.mom_1y >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>{(r.mom_1y * 100).toFixed(2)}%</span> : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.rs_spy != null ? <span className={r.rs_spy >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>{(r.rs_spy * 100).toFixed(2)}%</span> : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.liq_score?.toFixed(2) ?? "—"}</td>
                </tr>
              ))}
              {pagedRanking.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-gray-500">
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
        page={page}
        total={totalPages}
        onPrev={() => setPage((p) => Math.max(0, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
      />
    </div>
  );
}
