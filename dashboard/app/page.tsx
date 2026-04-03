"use client";

import React, { useState } from "react";
import { t } from "./i18n";
import type { Lang } from "./types";
import ThemeToggle from "@/components/ThemeToggle";
import { BulliaLogo } from "@/components/BulliaLogo";
import { LangToggle } from "@/components/LangToggle";
import { SlidingTabBar } from "@/components/SlidingTabBar";
import { LegendModal } from "@/components/modals/LegendModal";
import { AddHoldingModal } from "@/components/modals/AddHoldingModal";
import { EditProfileModal } from "@/components/modals/EditProfileModal";
import { StockDetailPanel } from "@/components/detail/StockDetailPanel";
import { OverviewTab } from "@/components/tabs/OverviewTab";
import { RankingTab } from "@/components/tabs/RankingTab";
import { TurnaroundsTab } from "@/components/tabs/TurnaroundsTab";
import { AccumulationTab } from "@/components/tabs/AccumulationTab";
import { CompoundersTab } from "@/components/tabs/CompoundersTab";
import { PortfolioTab } from "@/components/tabs/PortfolioTab";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [lang, setLang] = useState<Lang>("es");
  const [showLegend, setShowLegend] = useState(false);

  const data = useDashboardData();
  const portfolio = usePortfolio();
  const auth = useAuth();

  // Load portfolio when portfolio tab is active
  useEffect(() => {
    if (data.viewMode === "portfolio") portfolio.loadHoldings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.viewMode]);

  if (!data.viewMode) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      <LegendModal open={showLegend} onClose={() => setShowLegend(false)} lang={lang} />

      <AddHoldingModal
        open={portfolio.showAddHolding}
        onClose={portfolio.closeAddModal}
        rows={data.rows}
        symbolSearch={portfolio.symbolSearch}
        setSymbolSearch={portfolio.setSymbolSearch}
        newSymbol={portfolio.newSymbol}
        setNewSymbol={portfolio.setNewSymbol}
        symDropOpen={portfolio.symDropOpen}
        setSymDropOpen={portfolio.setSymDropOpen}
        newShares={portfolio.newShares}
        setNewShares={portfolio.setNewShares}
        newAvgCost={portfolio.newAvgCost}
        setNewAvgCost={portfolio.setNewAvgCost}
        holdingError={portfolio.holdingError}
        onAdd={portfolio.addHolding}
        lang={lang}
      />

      <EditProfileModal
        open={auth.showEditProfile}
        onClose={() => auth.setShowEditProfile(false)}
        userEmail={auth.userEmail}
        editName={auth.editName}
        setEditName={auth.setEditName}
        editLastName={auth.editLastName}
        setEditLastName={auth.setEditLastName}
        editAgeRange={auth.editAgeRange}
        setEditAgeRange={auth.setEditAgeRange}
        editExperience={auth.editExperience}
        setEditExperience={auth.setEditExperience}
        editRiskTolerance={auth.editRiskTolerance}
        setEditRiskTolerance={auth.setEditRiskTolerance}
        editSaving={auth.editSaving}
        onSave={auth.saveDisplayName}
        lang={lang}
      />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/85 backdrop-blur border-b dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto">
            <div className="flex items-center gap-2 flex-none mr-1">
              <BulliaLogo dark={mounted && resolvedTheme === "dark"} />
              <span className="font-semibold text-2xl hidden sm:block">BULLIA</span>
            </div>
            <SlidingTabBar viewMode={data.viewMode} setViewMode={data.setViewMode} lang={lang} />
          </div>
          <div className="flex items-center gap-2">
            <LangToggle lang={lang} setLang={setLang} />
            <button
              onClick={() => setShowLegend(true)}
              title={t("legendTitle", lang)}
              className="w-8 h-8 rounded-lg border dark:border-neutral-600 text-sm font-bold hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-200 flex items-center justify-center"
            >
              ?
            </button>
            <ThemeToggle />
            <button
              onClick={() => {
                const vm = data.viewMode;
                if (vm === "overview") { data.loadRanking(); data.loadTurnarounds(); data.loadCompounders(data.cmpHorizon); }
                else if (vm === "ranking") data.loadRanking();
                else if (vm === "turnarounds") data.loadTurnarounds();
                else data.loadCompounders(data.cmpHorizon);
              }}
              title={t("reloadBtn", lang)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border dark:border-neutral-600 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-200"
            >
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                className={data.loading ? "animate-spin" : ""}
              >
                <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
            {auth.userEmail && (
              <div className="relative" ref={auth.userMenuRef}>
                <button
                  onClick={() => auth.setShowUserMenu((v) => !v)}
                  className="w-8 h-8 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-sm font-bold hover:opacity-75 transition-opacity flex-none"
                  aria-label="User menu"
                >
                  {(auth.userDisplayName || auth.userEmail).charAt(0).toUpperCase()}
                </button>
                {auth.showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-neutral-900 border dark:border-neutral-700 rounded-2xl shadow-xl z-50 overflow-hidden animate-fadeInDown">
                    <div className="px-4 py-3 border-b dark:border-neutral-700">
                      {auth.userDisplayName && <div className="font-semibold text-sm truncate">{auth.userDisplayName}</div>}
                      <div className="text-xs text-gray-500 truncate">{auth.userEmail}</div>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          auth.setShowUserMenu(false);
                          const supabase = createClient();
                          supabase.auth.getUser().then(({ data: d }) => {
                            const meta = d.user?.user_metadata ?? {};
                            auth.setEditName(meta.first_name ?? "");
                            auth.setEditLastName(meta.last_name ?? "");
                            auth.setEditAgeRange(meta.age_range ?? "");
                            auth.setEditExperience(meta.experience ?? "");
                            auth.setEditRiskTolerance(meta.risk_tolerance ?? "");
                            auth.setShowEditProfile(true);
                          });
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
                      >
                        <span>✏️</span> {t("editProfile", lang)}
                      </button>
                      <button
                        onClick={auth.signOut}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        {t("portLogout", lang)}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {data.error && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 text-red-800 px-4 py-3 text-sm">
            Error: {data.error}
          </div>
        )}

        <StockDetailPanel
          selected={data.selected}
          finnhubData={data.finnhubData}
          finnhubLoading={data.finnhubLoading}
          prices={data.prices}
          pricesLoading={data.pricesLoading}
          rangeKey={data.rangeKey}
          setRangeKey={data.setRangeKey}
          lang={lang}
        />

        {/* ======= Tab content ======= */}
        {data.viewMode === "overview" && (
          <OverviewTab
            rows={data.rows}
            turnRows={data.turnRows}
            filteredCompounders={data.filteredCompounders}
            cmpHorizon={data.cmpHorizon}
            lang={lang}
            setViewMode={data.setViewMode}
            onOpen={data.handleOpen}
            onOpenFromSymbol={data.openFromSymbol}
          />
        )}

        {data.viewMode === "ranking" && (
          <RankingTab
            rows={data.rows}
            q={data.q} setQ={data.setQ}
            bucket={data.bucket} setBucket={data.setBucket}
            atype={data.atype} setAtype={data.setAtype}
            minScore={data.minScore} setMinScore={data.setMinScore}
            sortKey={data.sortKey} setSortKey={data.setSortKey}
            sortDir={data.sortDir} setSortDir={data.setSortDir}
            filteredRanking={data.filteredRanking}
            pagedRanking={data.pagedRanking}
            totalPages={data.totalPages}
            page={data.page} setPage={data.setPage}
            pageSize={data.pageSize} setPageSize={data.setPageSize}
            lang={lang}
            onOpen={data.handleOpen}
          />
        )}

        {data.viewMode === "turnarounds" && (
          <TurnaroundsTab
            turnRows={data.turnRows}
            pagedTurnRows={data.pagedTurnRows}
            totalTurnPages={data.totalTurnPages}
            turnPage={data.turnPage} setTurnPage={data.setTurnPage}
            pageSize={data.pageSize} setPageSize={data.setPageSize}
            lang={lang}
            onOpenFromSymbol={data.openFromSymbol}
          />
        )}

        {data.viewMode === "accumulation" && (
          <AccumulationTab
            accumRows={data.accumRows}
            pagedAccumRows={data.pagedAccumRows}
            totalAccumPages={data.totalAccumPages}
            accumPage={data.accumPage} setAccumPage={data.setAccumPage}
            pageSize={data.pageSize} setPageSize={data.setPageSize}
            lang={lang}
            onOpenFromSymbol={data.openFromSymbol}
          />
        )}

        {data.viewMode === "compounders" && (
          <CompoundersTab
            cmpHorizon={data.cmpHorizon} setCmpHorizon={data.setCmpHorizon}
            cagrMin={data.cagrMin} setCagrMin={data.setCagrMin}
            posMonthsMin={data.posMonthsMin} setPosMonthsMin={data.setPosMonthsMin}
            maxDDMax={data.maxDDMax} setMaxDDMax={data.setMaxDDMax}
            filteredCompounders={data.filteredCompounders}
            pagedCompounders={data.pagedCompounders}
            totalCmpPages={data.totalCmpPages}
            cmpPage={data.cmpPage} setCmpPage={data.setCmpPage}
            pageSize={data.pageSize} setPageSize={data.setPageSize}
            lang={lang}
            onOpenFromSymbol={data.openFromSymbol}
          />
        )}

        {data.viewMode === "portfolio" && (
          <PortfolioTab
            holdings={portfolio.holdings}
            holdingsLoading={portfolio.holdingsLoading}
            latestPrices={portfolio.latestPrices}
            dataDate={portfolio.dataDate}
            rows={data.rows}
            lang={lang}
            onShowAddHolding={() => { portfolio.setShowAddHolding(true); portfolio.setHoldingError(null); }}
            onRemoveHolding={portfolio.removeHolding}
            onOpen={data.handleOpen}
            onOpenFromSymbol={data.openFromSymbol}
          />
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-10 text-xs text-gray-500">
        {t("footer", lang)}
      </footer>
    </div>
  );
}