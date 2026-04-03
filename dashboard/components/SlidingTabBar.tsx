"use client";
import { useEffect, useRef, useState } from "react";
import { t } from "@/app/i18n";
import type { Lang, ViewMode } from "@/app/types";

type TabDef = { key: ViewMode; label: (lang: Lang) => string };
const TAB_DEFS: TabDef[] = [
  { key: "overview",     label: (lang) => t("tabOverview", lang) },
  { key: "ranking",      label: () => "Ranking" },
  { key: "turnarounds",  label: () => "Turnarounds" },
  { key: "accumulation", label: (lang) => lang === "es" ? "Zona Acumulación" : "Accumulation" },
  { key: "compounders",  label: () => "Compounders" },
  { key: "portfolio",    label: (lang) => t("tabPortfolio", lang) },
];

export function SlidingTabBar({
  viewMode,
  setViewMode,
  lang,
}: {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  lang: Lang;
}) {
  const btnRefs = useRef<Partial<Record<ViewMode, HTMLButtonElement | null>>>({});
  const [pill, setPill] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  useEffect(() => {
    const btn = btnRefs.current[viewMode];
    if (btn) setPill({ left: btn.offsetLeft, width: btn.offsetWidth, ready: true });
  }, [viewMode]);

  return (
    <div className="relative inline-flex rounded-xl overflow-hidden border dark:border-neutral-700 flex-none bg-white dark:bg-neutral-900">
      {pill.ready && (
        <span
          className="absolute top-0 bottom-0 bg-black dark:bg-white rounded-xl transition-all duration-200 ease-in-out pointer-events-none"
          style={{ left: pill.left, width: pill.width }}
        />
      )}
      {TAB_DEFS.map(({ key, label }) => (
        <button
          key={key}
          ref={(el) => { btnRefs.current[key] = el; }}
          onClick={() => setViewMode(key)}
          className={`relative z-10 px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap transition-colors duration-150 ${
            viewMode === key
              ? "text-white dark:text-black font-medium"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {label(lang)}
        </button>
      ))}
    </div>
  );
}
