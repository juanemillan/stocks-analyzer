"use client";
import React, { useCallback, useEffect, useState } from "react";
import type { Lang, ViewMode } from "@/app/types";

const STRATEGY_KEYS: ViewMode[] = ["turnarounds", "accumulation", "compounders", "value"];

// ── Icons ────────────────────────────────────────────────────────────────────

function IconDashboard({ bold }: { bold?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={bold ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconRanking({ bold }: { bold?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={bold ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  );
}

function IconDiary({ bold }: { bold?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={bold ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h9l3 3v13H6z" />
      <path d="M15 4v3h3" />
      <path d="M9 11h6M9 15h6" />
    </svg>
  );
}

function IconStrategies({ bold }: { bold?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={bold ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
    </svg>
  );
}

function IconPortfolio({ bold }: { bold?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={bold ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  );
}

function IconTurnarounds({ bold }: { bold?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={bold ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 17 7 10 11 14 14 9 18 12" />
      <polyline points="15 7 20 7 20 12" />
    </svg>
  );
}

function IconAccumulation({ bold }: { bold?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={bold ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 12l10 5 10-5" />
      <path d="M2 17l10 5 10-5" />
    </svg>
  );
}

function IconCompounders({ bold }: { bold?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={bold ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 20 7 12 11 17 15 8 20 13" />
    </svg>
  );
}

// ── Strategy sub-bar items ───────────────────────────────────────────────────

const STRATEGY_ITEMS = [
  { key: "turnarounds"  as ViewMode, labelEs: "Turnarounds",  labelEn: "Turnarounds",  Icon: IconTurnarounds  },
  { key: "accumulation" as ViewMode, labelEs: "Acumulaci\u00f3n",  labelEn: "Accumulation", Icon: IconAccumulation },
  { key: "compounders"  as ViewMode, labelEs: "Compounders",  labelEn: "Compounders",  Icon: IconCompounders  },
  { key: "value"        as ViewMode, labelEs: "Calidad y Valor", labelEn: "Quality & Value", Icon: IconCompounders },
];

// ── Sub-bar close trigger (exposed for external use e.g. tap on main content) ─

interface Props {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  lang: Lang;
  /** Call to let parent register a function that closes the sub-bar. */
  onSubBarRef?: (close: () => void) => void;
  /** When true, hide the bottom nav (e.g. chat is open) */
  chatOpen?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function BottomNavBar({ viewMode, setViewMode, lang, onSubBarRef, chatOpen = false }: Props) {
  const [subOpen, setSubOpen] = useState(false);

  const isStrategy = STRATEGY_KEYS.includes(viewMode);
  const isRanking   = viewMode === "ranking";

  // Expose close fn to parent
  const closeSubBar = useCallback(() => {
    setSubOpen(false);
  }, []);

  useEffect(() => {
    onSubBarRef?.(closeSubBar);
  }, [onSubBarRef, closeSubBar]);

  function handleStrategiesBtn() {
    setSubOpen((v) => !v);
  }

  function handleStrategySelect(key: ViewMode) {
    setViewMode(key);
    closeSubBar();
  }

  const stratLabel = lang === "es" ? "Estrategias" : "Strategies";
  const activePill = "bg-emerald-50 dark:bg-emerald-900/30";
  const btnCls = (active: boolean) =>
    `flex-1 flex flex-col items-center justify-center gap-1.5 py-2 transition-all duration-150 select-none active:scale-95 ${
      active ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
    }`;

  return (
    <>
      {/* ── Tap-anywhere overlay: closes sub-bar when user taps main content ── */}
      {subOpen && !chatOpen && (
        <div
          className="fixed inset-0 z-[18] md:hidden"
          aria-hidden="true"
          onClick={closeSubBar}
        />
      )}

      {/* ── Strategy sub-bar ─────────────────────────────────────────────── */}
      <div
        className={`fixed inset-x-0 z-[19] md:hidden
          bg-white dark:bg-gray-900
          border-t dark:border-gray-800
          shadow-[0_-4px_24px_rgba(0,0,0,0.10)]
          transition-all duration-300 ease-out
          ${subOpen
            ? "bottom-[148px] opacity-100 translate-y-0"
            : "bottom-[148px] opacity-0 translate-y-full pointer-events-none"
          }`}
      >
        <div className="flex h-[88px] max-w-lg mx-auto">
          {STRATEGY_ITEMS.map(({ key, labelEs, labelEn, Icon }) => {
            const active = viewMode === key;
            return (
              <button
                key={key}
                onClick={(e) => { e.stopPropagation(); handleStrategySelect(key); }}
                aria-current={active ? "page" : undefined}
                className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2 transition-all duration-150 active:scale-95 ${
                  active ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                <span className={`flex items-center justify-center w-11 h-8 rounded-xl transition-colors ${active ? activePill : ""}`}>
                  <Icon bold={active} />
                </span>
                <span className={`text-xs leading-none ${active ? "font-semibold" : "font-medium"}`}>
                  {lang === "es" ? labelEs : labelEn}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main nav bar ─────────────────────────────────────────────────── */}
      <nav
        className={`fixed bottom-[56px] inset-x-0 z-20 md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] ${
          chatOpen ? "opacity-0 pointer-events-none" : ""
        }`}
        aria-label="Main navigation"
      >
        <div className="flex h-[92px] max-w-lg mx-auto">

          {/* Dashboard */}
          <button onClick={() => { closeSubBar(); setViewMode("overview"); }} aria-current={viewMode === "overview" ? "page" : undefined} className={btnCls(viewMode === "overview")}>
            <span className={`flex items-center justify-center w-12 h-9 rounded-xl transition-colors ${viewMode === "overview" ? activePill : ""}`}>
              <IconDashboard bold={viewMode === "overview"} />
            </span>
            <span className={`text-xs leading-none ${viewMode === "overview" ? "font-semibold" : "font-medium"}`}>
              Dashboard
            </span>
          </button>

          {/* Ranking */}
          <button onClick={() => { closeSubBar(); setViewMode("ranking"); }} aria-current={isRanking ? "page" : undefined} className={btnCls(isRanking && !subOpen)}>
            <span className={`flex items-center justify-center w-12 h-9 rounded-xl transition-colors ${isRanking && !subOpen ? activePill : ""}`}>
              <IconRanking bold={isRanking && !subOpen} />
            </span>
            <span className={`text-xs leading-none ${isRanking && !subOpen ? "font-semibold" : "font-medium"}`}>
              Ranking
            </span>
          </button>

          <button onClick={() => { closeSubBar(); setViewMode("diary"); }} aria-current={viewMode === "diary" ? "page" : undefined} className={btnCls(viewMode === "diary")}>
            <span className={`flex items-center justify-center w-12 h-9 rounded-xl transition-colors ${viewMode === "diary" ? activePill : ""}`}>
              <IconDiary bold={viewMode === "diary"} />
            </span>
            <span className={`text-xs leading-none ${viewMode === "diary" ? "font-semibold" : "font-medium"}`}>
              {lang === "es" ? "Diario" : "Diary"}
            </span>
          </button>

          {/* Strategies */}
          <button onClick={handleStrategiesBtn} aria-expanded={subOpen} className={btnCls(isStrategy || subOpen)}>
            <span className={`flex items-center justify-center w-12 h-9 rounded-xl transition-colors ${isStrategy || subOpen ? activePill : ""}`}>
              <IconStrategies bold={isStrategy || subOpen} />
            </span>
            <span className={`text-xs leading-none ${isStrategy || subOpen ? "font-semibold" : "font-medium"}`}>
              {stratLabel}
            </span>
          </button>

          {/* Portfolio */}
          <button onClick={() => { closeSubBar(); setViewMode("portfolio"); }} aria-current={viewMode === "portfolio" ? "page" : undefined} className={btnCls(viewMode === "portfolio")}>
            <span className={`flex items-center justify-center w-12 h-9 rounded-xl transition-colors ${viewMode === "portfolio" ? activePill : ""}`}>
              <IconPortfolio bold={viewMode === "portfolio"} />
            </span>
            <span className={`text-xs leading-none ${viewMode === "portfolio" ? "font-semibold" : "font-medium"}`}>
              Portfolio
            </span>
          </button>

        </div>
      </nav>
    </>
  );
}
