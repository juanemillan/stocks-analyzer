"use client";
import { useState } from "react";
import type { Lang, RankRow } from "@/app/types";
import { SymbolLogo } from "@/components/ui/SymbolLogo";

interface FavoritesTabProps {
  rows: RankRow[];
  watchlist: Set<string>;
  onToggleFavorite: (symbol: string) => void;
  onOpen: (row: RankRow) => void;
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
  onToggleFavorite,
  onOpen,
  selectedSymbol,
  lang,
}: FavoritesTabProps) {
  const [copied, setCopied] = useState(false);
  const favorites = rows
    .filter((r) => watchlist.has(r.symbol))
    .sort((a, b) => (b.final_score ?? 0) - (a.final_score ?? 0));

  if (favorites.length === 0) {
    return (
      <div className="animate-fadeIn flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <p className="text-sm">No favorites yet — tap the heart on any symbol to add it here.</p>
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
                <th className="w-8 px-2 py-2"></th>
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
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(r.symbol); }}
                      className="flex items-center justify-center transition-transform hover:scale-125"
                      title="Remove from favorites"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
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
    </div>
  );
}
