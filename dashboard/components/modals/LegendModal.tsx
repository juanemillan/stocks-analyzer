"use client";
import { LABELS, t } from "@/app/i18n";
import type { Lang } from "@/app/types";

interface LegendModalProps {
  open: boolean;
  onClose: () => void;
  lang: Lang;
}

export function LegendModal({ open, onClose, lang }: LegendModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-backdropIn"
      onClick={onClose}
    >
      {/* outer shell: clips border-radius, no overflow */}
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* sticky header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
          <h2 className="text-lg font-bold">{t("legendTitle", lang)}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-neutral-800 transition-all duration-150"
          >
            &times;
          </button>
        </div>
        {/* scrollable body */}
        <div className="overflow-y-auto px-6 pb-2">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {([
              ["lgPosTitle",    "lgPosDesc"],
              ["lgRebTitle",    "lgRebDesc"],
              ["lgBucketTitle", "lgBucketDesc"],
              ["lgCagrTitle",   "lgCagrDesc"],
              ["lgLiqTitle",    "lgLiqDesc"],
              ["lgMddTitle",    "lgMddDesc"],
              ["lgMomTitle",    "lgMomDesc"],
              ["lgRsTitle",     "lgRsDesc"],
              ["lgScoreTitle",  "lgScoreDesc"],
              ["lgTrendTitle",  "lgTrendDesc"],
              ["lgVolTitle",    "lgVolDesc"],
            ] as Array<[keyof typeof LABELS, keyof typeof LABELS]>).map(([titleKey, descKey], i, arr) => (
              <div
                key={titleKey}
                className={`border rounded-xl p-3${i === arr.length - 1 && arr.length % 2 !== 0 ? " col-span-2" : ""}`}
              >
                <dt className="font-semibold text-gray-900 mb-0.5">{t(titleKey, lang)}</dt>
                <dd className="text-gray-600 leading-snug text-xs">{t(descKey, lang)}</dd>
              </div>
            ))}
          </dl>
        </div>
        {/* sticky footer button */}
        <div className="px-6 py-4 shrink-0">
          <button
            onClick={onClose}
            className="w-full rounded-xl py-2 bg-black text-white text-sm hover:opacity-90 transition-opacity duration-150 active:scale-[0.98]"
          >
            {t("legendClose", lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
