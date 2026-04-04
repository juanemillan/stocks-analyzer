"use client";
import { t } from "@/app/i18n";
import type { Lang, RankRow } from "@/app/types";

interface AddHoldingModalProps {
  open: boolean;
  onClose: () => void;
  rows: RankRow[];
  symbolSearch: string;
  setSymbolSearch: (v: string) => void;
  newSymbol: string;
  setNewSymbol: (v: string) => void;
  symDropOpen: boolean;
  setSymDropOpen: (v: boolean) => void;
  newShares: string;
  setNewShares: (v: string) => void;
  newAvgCost: string;
  setNewAvgCost: (v: string) => void;
  holdingError: string | null;
  onAdd: () => void;
  lang: Lang;
}

export function AddHoldingModal({
  open,
  onClose,
  rows,
  symbolSearch,
  setSymbolSearch,
  newSymbol,
  setNewSymbol,
  symDropOpen,
  setSymDropOpen,
  newShares,
  setNewShares,
  newAvgCost,
  setNewAvgCost,
  holdingError,
  onAdd,
  lang,
}: AddHoldingModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-backdropIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="font-bold text-base">{t("portAddHolding", lang)}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-neutral-800 transition-all duration-150">&times;</button>
        </div>
        <div className="px-6 pb-6 flex flex-col gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder={`${t("portSymbol", lang)} — ${t("portSearchHint", lang)}`}
              value={symbolSearch}
              onChange={(e) => {
                const v = e.target.value.toUpperCase();
                setSymbolSearch(v);
                setNewSymbol(v);
                setSymDropOpen(true);
              }}
              onFocus={() => setSymDropOpen(true)}
              onBlur={() => setTimeout(() => setSymDropOpen(false), 150)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black uppercase"
            />
            {symDropOpen && symbolSearch.length > 0 &&
              rows.filter((r) => {
                const q = symbolSearch.toLowerCase();
                return r.symbol.toLowerCase().includes(q) || (r.name ?? "").toLowerCase().includes(q);
              }).length > 0 && (
              <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {rows
                  .filter((r) => {
                    const q = symbolSearch.toLowerCase();
                    return r.symbol.toLowerCase().includes(q) || (r.name ?? "").toLowerCase().includes(q);
                  })
                  .slice(0, 8)
                  .map((r) => (
                    <li
                      key={r.symbol}
                      onMouseDown={() => {
                        setNewSymbol(r.symbol);
                        setSymbolSearch(r.symbol);
                        setSymDropOpen(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-100 first:rounded-t-xl last:rounded-b-xl transition-colors duration-100"
                    >
                      <span className="font-mono font-semibold w-16 shrink-0 text-xs">{r.symbol}</span>
                      <span className="text-gray-500 truncate text-xs">{r.name}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
          <input
            type="number"
            placeholder={t("portShares", lang)}
            min="0"
            step="any"
            value={newShares}
            onChange={(e) => setNewShares(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
          />
          <input
            type="number"
            placeholder={`${t("portAvgCost", lang)} (${t("portOptional", lang)})`}
            min="0"
            step="any"
            value={newAvgCost}
            onChange={(e) => setNewAvgCost(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
          />
          {holdingError && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{holdingError}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 rounded-xl py-2 border text-sm hover:bg-gray-50 transition-all duration-150 active:scale-[0.98]">
              {t("portCancel", lang)}
            </button>
            <button onClick={onAdd} className="flex-1 rounded-xl py-2 bg-black text-white text-sm hover:opacity-90 transition-opacity duration-150 active:scale-[0.98]">
              {t("portSave", lang)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
