"use client";

import React, { useState } from "react";
import { t } from "./i18n";
import type { Lang, ViewMode } from "./types";
import ThemeToggle from "@/components/ThemeToggle";
import { BulliaLogo } from "@/components/BulliaLogo";
import { LangToggle } from "@/components/LangToggle";
import { SlidingTabBar } from "@/components/SlidingTabBar";
import { BottomNavBar } from "@/components/BottomNavBar";
import { LegendModal } from "@/components/modals/LegendModal";
import { AddHoldingModal } from "@/components/modals/AddHoldingModal";
import { EditProfileModal } from "@/components/modals/EditProfileModal";
import { ConnectRacionalModal } from "@/components/modals/ConnectRacionalModal";
import { RequestAssetModal } from "@/components/modals/RequestAssetModal";
import { requestAsset, getLatestInsight } from "./actions";
import type { AiInsight } from "./actions";
import { StockDetailPanel } from "@/components/detail/StockDetailPanel";
import { OverviewTab } from "@/components/tabs/OverviewTab";
import { RankingTab } from "@/components/tabs/RankingTab";
import { TurnaroundsTab } from "@/components/tabs/TurnaroundsTab";
import { AccumulationTab } from "@/components/tabs/AccumulationTab";
import { CompoundersTab } from "@/components/tabs/CompoundersTab";
import { PortfolioTab } from "@/components/tabs/PortfolioTab";
import { ProfileTab } from "@/components/tabs/ProfileTab";
import { FavoritesTab } from "@/components/tabs/FavoritesTab";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useAuth } from "@/hooks/useAuth";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useChat } from "@/hooks/useChat";
import { useAlerts } from "@/hooks/useAlerts";
import { ChatBar } from "@/components/ChatBar";

export default function Dashboard() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [lang, setLang] = useState<Lang>("es");
  const [showLegend, setShowLegend] = useState(false);
  const [showRequestAsset, setShowRequestAsset] = useState(false);
  const prevViewMode = React.useRef<ViewMode>("overview");

  const data = useDashboardData();
  const portfolio = usePortfolio();
  const auth = useAuth();
  const { watchlist, toggle: toggleWatchlist } = useWatchlist();
  const chat = useChat(lang);
  const alerts = useAlerts();

  // AI nightly insight
  const [insight, setInsight] = React.useState<AiInsight | null>(null);
  React.useEffect(() => {
    getLatestInsight(lang).then(setInsight).catch(() => {});
  }, [lang]);

  // Build context string for the AI — refreshed whenever holdings, prices or ranking change
  const chatContext = React.useMemo(() => {
    const parts: string[] = [];

    // Portfolio positions
    if (portfolio.holdings.length > 0) {
      const lines = portfolio.holdings
        .filter((h) => !h.sold_at)
        .map((h) => {
          const price = portfolio.latestPrices[h.symbol]?.price;
          const pnlPct =
            h.avg_cost && price ? (((price - h.avg_cost) / h.avg_cost) * 100).toFixed(1) : "n/a";
          return `${h.symbol}: ${h.shares} shares @ $${h.avg_cost ?? "?"}, current $${price ?? "?"}, P&L ${pnlPct}%`;
        });
      if (lines.length > 0) parts.push(`Portfolio positions:\n${lines.join("\n")}`);
    }

    // Full ranking context (Alta Convicción + top 20 total)
    if (data.rows.length > 0) {
      const high = data.rows.filter((r) => (r.final_score ?? 0) >= 0.7);
      const top20 = data.rows.slice(0, 20);
      // Deduplicate: high conviction first, then fill to 20 with remaining
      const seen = new Set(high.map((r) => r.symbol));
      const combined = [...high, ...top20.filter((r) => !seen.has(r.symbol))].slice(0, 25);
      const lines = combined.map((r) =>
        `${r.symbol} score=${r.final_score?.toFixed(3) ?? "?"} bucket=${r.bucket ?? "?"} mom1m=${r.mom_1m?.toFixed(2) ?? "?"} mom3m=${r.mom_3m?.toFixed(2) ?? "?"}`
      );
      parts.push(`Ranking (Alta Convicción + top 20):\n${lines.join("\n")}`);
    }

    // Top turnarounds
    if (data.turnRows.length > 0) {
      const turns = data.turnRows.slice(0, 5).map(
        (r) => `${r.symbol} rebound=${r.rebound_from_low?.toFixed(1) ?? "?"}%`
      );
      parts.push(`Top turnarounds:\n${turns.join("\n")}`);
    }

    // Currently viewed asset
    if (data.selected) {
      const s = data.selected;
      parts.push(
        `Currently viewing: ${s.symbol} (${s.name ?? ""}), score=${s.final_score?.toFixed(3) ?? "?"}, bucket=${s.bucket ?? "?"}, mom1m=${s.mom_1m?.toFixed(2) ?? "?"}`
      );
    }

    return parts.length > 0 ? parts.join("\n\n") : undefined;
  }, [portfolio.holdings, portfolio.latestPrices, data.rows, data.turnRows, data.selected]);

  // Track previous view so profile back-button knows where to go
  useEffect(() => {
    if (data.viewMode && data.viewMode !== "profile" && data.viewMode !== "favorites") prevViewMode.current = data.viewMode;
  }, [data.viewMode]);

  // Load portfolio when portfolio tab is active; also ensure ranking rows are
  // loaded (needed for the Add Holding symbol search dropdown)
  useEffect(() => {
    if (data.viewMode === "portfolio") {
      portfolio.loadHoldings();
      if (data.rows.length === 0) data.loadRanking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.viewMode]);

  // Pre-populate profile edit fields when navigating to profile view
  useEffect(() => {
    if (data.viewMode === "profile") {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: d }) => {
        const meta = d.user?.user_metadata ?? {};
        auth.setEditName(meta.first_name ?? "");
        auth.setEditLastName(meta.last_name ?? "");
        auth.setEditAgeRange(meta.age_range ?? "");
        auth.setEditExperience(meta.experience ?? "");
        auth.setEditRiskTolerance(meta.risk_tolerance ?? "");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.viewMode]);

  const handleReload = () => {
    const vm = data.viewMode;
    if (vm === "overview" || vm === "profile") {
      data.loadRanking(true); data.loadTurnarounds(true); data.loadCompounders(data.cmpHorizon, true);
    } else if (vm === "ranking") data.loadRanking(true);
    else if (vm === "turnarounds") data.loadTurnarounds(true);
    else if (vm === "accumulation") data.loadAccumulation(true);
    else if (vm === "compounders") data.loadCompounders(data.cmpHorizon, true);
    else data.loadRanking(true);
  };

  if (!data.viewMode) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      <LegendModal open={showLegend} onClose={() => setShowLegend(false)} lang={lang} />

      <ConnectRacionalModal
        open={portfolio.showConnectRacional}
        syncing={portfolio.racionalSyncing}
        error={portfolio.racionalSyncError}
        onClose={() => portfolio.setShowConnectRacional(false)}
        onConnect={portfolio.syncFromRacional}
      />

      <RequestAssetModal
        open={showRequestAsset}
        onClose={() => setShowRequestAsset(false)}
        onSubmit={async (symbol, reason) => {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Debes iniciar sesión para solicitar un activo");
          await requestAsset(user.id, symbol, reason);
        }}
      />

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

      <StockDetailPanel
        open={data.detailOpen}
        onClose={data.closeDetail}
        selected={data.selected}
        finnhubData={data.finnhubData}
        finnhubLoading={data.finnhubLoading}
        prices={data.prices}
        pricesLoading={data.pricesLoading}
        rangeKey={data.rangeKey}
        setRangeKey={data.setRangeKey}
        lang={lang}
        alertRules={data.selected ? alerts.forSymbol(data.selected.symbol) : []}
        onUpsertAlert={alerts.upsert}
        onRemoveAlert={alerts.remove}
      />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/85 backdrop-blur border-b dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-row justify-between gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto">
            <div className="flex items-center gap-2 flex-none mr-1">
              <BulliaLogo dark={mounted && resolvedTheme === "dark"} />
              <span className="font-semibold text-2xl hidden sm:block">BULLIA</span>
            </div>
            {/* Tab bar: hidden on mobile (uses BottomNavBar) — visible on desktop */}
            <div className="hidden md:block">
              <SlidingTabBar viewMode={data.viewMode} setViewMode={data.setViewMode} lang={lang} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* All controls — desktop only */}
            <div className="hidden md:flex items-center gap-2">
              <LangToggle lang={lang} setLang={setLang} />
              <ThemeToggle />
              <button
                onClick={handleReload}
                title={t("reloadBtn", lang)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border dark:border-neutral-600 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all duration-150 active:scale-95"
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
              <button
                onClick={() => setShowLegend(true)}
                title={t("legendTitle", lang)}
                className="w-8 h-8 rounded-lg border dark:border-neutral-600 text-sm font-bold hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all duration-150 active:scale-95 flex items-center justify-center"
              >
                ?
              </button>
            </div>
            {/* Profile avatar — mobile: navigate to profile view | desktop: dropdown */}
            {auth.userEmail && (
              <div className="relative md:block" ref={auth.userMenuRef}>
                <button
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      if (data.viewMode === "profile") {
                        data.setViewMode(prevViewMode.current);
                      } else {
                        data.setViewMode("profile");
                      }
                    } else {
                      auth.setShowUserMenu((v) => !v);
                    }
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-none transition-all duration-150 active:scale-95 ${
                    data.viewMode === "profile"
                      ? "bg-emerald-500 text-white ring-2 ring-emerald-300"
                      : "bg-black text-white dark:bg-white dark:text-black hover:opacity-75"
                  }`}
                  aria-label="Profile"
                >
                  {(auth.userDisplayName || auth.userEmail).charAt(0).toUpperCase()}
                </button>
                {auth.showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-neutral-900 border dark:border-neutral-700 rounded-2xl shadow-xl z-50 overflow-hidden animate-fadeInDown">
                    <div className="px-4 py-3 border-b dark:border-neutral-700">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t("profileLabel", lang)}</span>
                        <button
                          onClick={() => {
                            auth.setShowUserMenu(false);
                            auth.setShowEditProfile(true);
                          }}
                          title={t("editProfile", lang)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-neutral-800 transition-colors duration-150"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </div>
                      {auth.userDisplayName && <div className="font-semibold text-sm truncate mt-1">{auth.userDisplayName}</div>}
                      <div className="text-xs text-gray-500 truncate">{auth.userEmail}</div>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { auth.setShowUserMenu(false); data.setViewMode("favorites"); }}
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-150"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        Favorites{watchlist.size > 0 ? ` (${watchlist.size})` : ""}
                      </button>
                      <button
                        onClick={auth.signOut}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
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
      <main className="max-w-6xl mx-auto px-4 py-6 pb-[164px] md:pb-6" style={{ paddingBottom: "calc(164px + env(safe-area-inset-bottom))" }}>
        {data.error && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 text-red-800 px-4 py-3 text-sm">
            Error: {data.error}
          </div>
        )}

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
            insight={insight}
            onAskFollowUp={(text) => { chat.sendMessage(text, chatContext); chat.setIsOpen(true); }}
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
            selectedSymbol={data.selected?.symbol}
            onOpen={data.handleOpen}
            watchlist={watchlist}
            onToggleWatchlist={toggleWatchlist}
            onAddToPortfolio={(symbol) => {
              portfolio.setNewSymbol(symbol);
              portfolio.setShowAddHolding(true);
              portfolio.setHoldingError(null);
              data.setViewMode("portfolio");
            }}
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
            correlationData={portfolio.correlationData}
            weekChanges={portfolio.weekChanges}
            techSignals={portfolio.techSignals}
            onShowConnectRacional={() => portfolio.setShowConnectRacional(true)}
            onShowRequestAsset={() => setShowRequestAsset(true)}
            racionalSyncing={portfolio.racionalSyncing}
            racionalSyncError={portfolio.racionalSyncError}
            racionalSyncInfo={portfolio.racionalSyncInfo}
            lastRacionalSync={portfolio.lastRacionalSync}
            onUpdateHolding={portfolio.updateHolding}
            watchlist={watchlist}
            onToggleWatchlist={toggleWatchlist}
            snapshots={portfolio.snapshots}
          />
        )}

        {data.viewMode === "profile" && (
          <ProfileTab
            lang={lang}
            setLang={setLang}
            userEmail={auth.userEmail}
            userDisplayName={auth.userDisplayName}
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
            onSignOut={auth.signOut}
            onShowLegend={() => setShowLegend(true)}
            onReload={handleReload}
            loading={data.loading}
            isAdmin={!!process.env.NEXT_PUBLIC_ADMIN_EMAIL && auth.userEmail === process.env.NEXT_PUBLIC_ADMIN_EMAIL}
          />
        )}

        {data.viewMode === "favorites" && (
          <FavoritesTab
            rows={data.rows}
            watchlist={watchlist}
            onToggleFavorite={toggleWatchlist}
            onOpen={data.handleOpen}
            selectedSymbol={data.selected?.symbol}
            lang={lang}
          />
        )}
      </main>

      <BottomNavBar
        viewMode={data.viewMode}
        setViewMode={data.setViewMode}
        lang={lang}
      />

      {auth.userEmail && (
        <ChatBar
          messages={chat.messages}
          input={chat.input}
          setInput={chat.setInput}
          isThinking={chat.isThinking}
          isOpen={chat.isOpen}
          setIsOpen={chat.setIsOpen}
          onSend={chat.sendMessage}
          onClear={chat.clearMessages}
          lang={lang}
          context={chatContext}
        />
      )}

      <footer className="max-w-6xl mx-auto px-4 py-10 text-xs text-gray-500">
        {t("footer", lang)}
      </footer>
    </div>
  );
}