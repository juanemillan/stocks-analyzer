"use client";
import { useState } from "react";
import type { Lang, RankRow } from "@/app/types";
import { SymbolLogo } from "@/components/ui/SymbolLogo";
import type { WatchlistDetails } from "@/hooks/useWatchlist";

interface FavoritesTabProps {
  rows: RankRow[];
  watchlist: Set<string>;
  details: Record<string, WatchlistDetails>;
  onSaveDetails: (symbol: string, values: WatchlistDetails) => Promise<void>;
  onToggleFavorite: (symbol: string) => void;
  onOpen: (row: RankRow) => void;
  onBrowseRanking: () => void;
  selectedSymbol?: string | null;
  lang: Lang;
}

function ScoreDelta({ delta }: { delta?: number | null }) {
  if (delta == null || Math.abs(delta) < 0.001) return <span className="text-gray-400 text-xs ml-1">→</span>;
  if (delta > 0) return <span className="text-emerald-500 text-xs ml-1">▲ +{delta.toFixed(3)}</span>;
  return <span className="text-red-400 text-xs ml-1">▼ {delta.toFixed(3)}</span>;
}

export function FavoritesTab({
  rows,
  watchlist,
  details,
  onSaveDetails,
  onToggleFavorite,
  onOpen,
  onBrowseRanking,
  selectedSymbol,
  lang,
}: FavoritesTabProps) {
  const [copied, setCopied] = useState(false);
  const [compareSymbols, setCompareSymbols] = useState<string[]>([]);
  const favorites = rows
    .filter((r) => watchlist.has(r.symbol))
    .sort((a, b) => (b.final_score ?? 0) - (a.final_score ?? 0));
  const compared = favorites.filter((row) => compareSymbols.includes(row.symbol));

  function toggleCompare(symbol: string) {
    setCompareSymbols((current) => current.includes(symbol)
      ? current.filter((item) => item !== symbol)
      : current.length < 3 ? [...current, symbol] : current);
  }

  if (favorites.length === 0) {
    return (
      <div className="animate-fadeIn flex flex-col items-center justify-center py-24 gap-3 text-center text-gray-500 dark:text-gray-400">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
          {lang === "es" ? "Aún no tienes favoritos" : "No favorites yet"}
        </h2>
        <p className="max-w-sm text-sm">
          {lang === "es"
            ? "Guarda activos para seguirlos y encontrarlos rápidamente aquí."
            : "Save symbols to follow them and find them quickly here."}
        </p>
        <button
          type="button"
          onClick={onBrowseRanking}
          className="mt-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950"
        >
          {lang === "es" ? "Ver ranking" : "Browse ranking"}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center gap-2 mb-4">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <h2 className="text-base font-semibold">Favorites</h2>
        <span className="text-sm text-gray-500">({favorites.length})</span>
        <span className="text-xs text-gray-500">{lang === "es" ? `Comparar: ${compared.length}/3` : `Compare: ${compared.length}/3`}</span>
        <div className="ml-auto">
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set("wl", favorites.map((r) => r.symbol).join(","));
              navigator.clipboard.writeText(url.toString()).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-600 dark:text-gray-400 hover:text-emerald-600 transition-colors"
            title={lang === "es" ? "Copiar enlace de favoritos" : "Copy favorites link"}
          >
            {copied ? (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{lang === "es" ? "¡Copiado!" : "Copied!"}</>
            ) : (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>{lang === "es" ? "Compartir" : "Share"}</>
            )}
          </button>
        </div>
      </div>

      <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="w-16 px-2 py-2"></th>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2 text-right">Score</th>
                <th className="px-3 py-2 text-right">Mom 1m</th>
                <th className="px-3 py-2 text-right">Mom 3m</th>
                <th className="px-3 py-2 text-right">RS vs SPY</th>
                <th className="px-3 py-2 text-right">Liq.</th>
              </tr>
            </thead>
            <tbody>
              {favorites.map((r) => (
                <tr
                  key={r.symbol}
                  className={`border-t transition-colors duration-150 cursor-pointer ${
                    r.symbol === selectedSymbol
                      ? "bg-emerald-50 dark:bg-emerald-900/10 border-l-2 border-l-emerald-500"
                      : "hover:bg-gray-50 dark:hover:bg-neutral-800"
                  }`}
                  onClick={() => onOpen(r)}
                >
                  <td className="w-8 px-2 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(r.symbol); }}
                        className="flex items-center justify-center transition-transform hover:scale-125"
                        title="Remove from favorites"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCompare(r.symbol); }}
                        aria-pressed={compareSymbols.includes(r.symbol)}
                        title={lang === "es" ? "Seleccionar para comparar" : "Select to compare"}
                        className={`flex h-5 w-5 items-center justify-center rounded border text-[11px] transition-colors ${compareSymbols.includes(r.symbol) ? "border-emerald-600 bg-emerald-600 text-white" : "border-gray-300 text-gray-400 hover:border-emerald-500 dark:border-neutral-600"}`}
                      >
                        {compareSymbols.includes(r.symbol) ? "✓" : "+"}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <SymbolLogo symbol={r.symbol} size={28} />
                      <span className="font-semibold">{r.symbol}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">{r.name ?? "—"}</td>
                  <td className="px-3 py-2">{r.asset_type ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.final_score != null
                      ? <span className={r.final_score >= 0.7 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : r.final_score < 0.35 ? "text-red-500 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}>{r.final_score.toFixed(3)}</span>
                      : "—"}
                    <ScoreDelta delta={r.score_delta} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.mom_1m != null ? <span className={r.mom_1m >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>{(r.mom_1m * 100).toFixed(2)}%</span> : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.mom_3m != null ? <span className={r.mom_3m >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>{(r.mom_3m * 100).toFixed(2)}%</span> : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.rs_spy != null ? <span className={r.rs_spy >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>{(r.rs_spy * 100).toFixed(2)}%</span> : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.liq_score?.toFixed(2) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {compared.length >= 2 && (
        <section className="mt-4 overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3 dark:border-neutral-700">
            <div><h3 className="text-sm font-semibold">{lang === "es" ? "Comparación" : "Comparison"}</h3><p className="text-xs text-gray-500">{lang === "es" ? "Revisa calidad, momentum y tu plan antes de decidir." : "Review quality, momentum and your plan before deciding."}</p></div>
            <button onClick={() => setCompareSymbols([])} className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white">{lang === "es" ? "Limpiar" : "Clear"}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[540px] w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-neutral-800"><tr><th className="px-4 py-3 text-xs font-medium text-gray-500">{lang === "es" ? "Métrica" : "Metric"}</th>{compared.map((row) => <th key={row.symbol} className="px-4 py-3"><button onClick={() => onOpen(row)} className="font-semibold hover:underline">{row.symbol}</button></th>)}</tr></thead>
              <tbody className="divide-y dark:divide-neutral-800">
                {[
                  [lang === "es" ? "Sector" : "Sector", (row: RankRow) => row.sector ?? "—"],
                  ["Score", (row: RankRow) => row.final_score?.toFixed(3) ?? "—"],
                  ["Momentum 1m", (row: RankRow) => row.mom_1m != null ? `${(row.mom_1m * 100).toFixed(1)}%` : "—"],
                  ["Momentum 3m", (row: RankRow) => row.mom_3m != null ? `${(row.mom_3m * 100).toFixed(1)}%` : "—"],
                  ["RS vs SPY", (row: RankRow) => row.rs_spy != null ? `${(row.rs_spy * 100).toFixed(1)}%` : "—"],
                  [lang === "es" ? "Liquidez" : "Liquidity", (row: RankRow) => row.liq_score?.toFixed(2) ?? "—"],
                  [lang === "es" ? "Objetivo" : "Target", (row: RankRow) => details[row.symbol]?.target_price != null ? `$${details[row.symbol].target_price}` : "—"],
                  [lang === "es" ? "Estado" : "Status", (row: RankRow) => details[row.symbol]?.status ?? "watching"],
                ].map(([label, value]) => <tr key={String(label)}><th className="px-4 py-2 text-xs font-medium text-gray-500">{String(label)}</th>{compared.map((row) => <td key={row.symbol} className="px-4 py-2 tabular-nums">{(value as (row: RankRow) => string)(row)}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-4">
        <h3 className="mb-2 text-sm font-semibold">{lang === "es" ? "Plan de seguimiento" : "Watch plan"}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {favorites.map((r) => {
            const detail = details[r.symbol] ?? { thesis: null, target_price: null, invalidation: null, review_date: null, status: "watching" as const };
            return (
              <details key={r.symbol} className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-neutral-900 dark:border-neutral-700">
                <summary className="cursor-pointer list-none flex items-center gap-2"><SymbolLogo symbol={r.symbol} size={24} /><span className="font-semibold">{r.symbol}</span><span className="ml-auto text-xs text-gray-500">{detail.status}</span></summary>
                <form className="mt-3 space-y-3" onSubmit={(event) => {
                  event.preventDefault(); const form = new FormData(event.currentTarget);
                  onSaveDetails(r.symbol, { thesis: String(form.get("thesis") || ""), target_price: form.get("target_price") ? Number(form.get("target_price")) : null, invalidation: String(form.get("invalidation") || ""), review_date: String(form.get("review_date") || "") || null, status: String(form.get("status")) as WatchlistDetails["status"] });
                }}>
                  <textarea name="thesis" defaultValue={detail.thesis ?? ""} maxLength={1000} rows={3} placeholder={lang === "es" ? "Tu tesis: por qué lo sigues" : "Your thesis: why you follow it"} className="w-full rounded-xl border bg-transparent p-2 text-sm dark:border-neutral-700" />
                  <textarea name="invalidation" defaultValue={detail.invalidation ?? ""} maxLength={500} rows={2} placeholder={lang === "es" ? "Invalidación: qué te haría cambiar de opinión" : "Invalidation: what would change your mind"} className="w-full rounded-xl border bg-transparent p-2 text-sm dark:border-neutral-700" />
                  <div className="grid grid-cols-2 gap-2"><input name="target_price" type="number" step="0.01" defaultValue={detail.target_price ?? ""} placeholder={lang === "es" ? "Precio objetivo" : "Target price"} className="min-w-0 rounded-xl border bg-transparent p-2 text-sm dark:border-neutral-700" /><input name="review_date" type="date" defaultValue={detail.review_date ?? ""} className="min-w-0 rounded-xl border bg-transparent p-2 text-sm dark:border-neutral-700" /></div>
                  <div className="flex gap-2"><select name="status" defaultValue={detail.status} className="flex-1 rounded-xl border bg-transparent p-2 text-sm dark:border-neutral-700"><option value="watching">{lang === "es" ? "Observando" : "Watching"}</option><option value="researching">{lang === "es" ? "Investigando" : "Researching"}</option><option value="ready">{lang === "es" ? "Lista para revisar" : "Ready to review"}</option><option value="passed">{lang === "es" ? "Descartada" : "Passed"}</option></select><button type="submit" className="rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700">{lang === "es" ? "Guardar" : "Save"}</button></div>
                </form>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
