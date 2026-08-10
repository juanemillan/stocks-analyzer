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
import { requestAsset } from "./actions";
import { computeDiversificationScore } from "@/lib/correlation";
import { StockDetailPanel } from "@/components/detail/StockDetailPanel";
import { OverviewTab } from "@/components/tabs/OverviewTab";
import { DiaryTab } from "@/components/tabs/DiaryTab";
import { RankingTab } from "@/components/tabs/RankingTab";
import { TurnaroundsTab } from "@/components/tabs/TurnaroundsTab";
import { AccumulationTab } from "@/components/tabs/AccumulationTab";
import { CompoundersTab } from "@/components/tabs/CompoundersTab";
import { ValueQualityTab } from "@/components/tabs/ValueQualityTab";
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
import { OnboardingScreen } from "@/components/OnboardingScreen";

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
  const { watchlist, toggle: toggleWatchlist, bulkAdd: bulkAddWatchlist, userId: watchlistUserId } = useWatchlist();
  const chat = useChat(lang);
  const alerts = useAlerts();

  // First-time onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("bullia_onboarded")) {
      setShowOnboarding(true);
    }
  }, []);
  const handleOnboardingDone = () => {
    localStorage.setItem("bullia_onboarded", "1");
    setShowOnboarding(false);
  };

  // Shareable watchlist — import ?wl=SYM1,SYM2 from URL on first load
  const pendingWlRef = React.useRef<string[] | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const wl = params.get("wl");
    if (wl) {
      pendingWlRef.current = wl.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      const url = new URL(window.location.href);
      url.searchParams.delete("wl");
      history.replaceState(null, "", url.toString());
    }
  }, []);
  useEffect(() => {
    if (!watchlistUserId || !pendingWlRef.current?.length) return;
    bulkAddWatchlist(pendingWlRef.current);
    pendingWlRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlistUserId]);

  // Warm shared server caches after sign-in (non-blocking).
  const warmedRef = React.useRef(false);
  React.useEffect(() => {
    if (!auth.userEmail || warmedRef.current) return;
    warmedRef.current = true;
    fetch("/api/warm-cache", { method: "POST" }).catch(() => {});
  }, [auth.userEmail]);

  // Global "jump to symbol" search (works beyond top-1000 ranking list).
  const [jumpQ, setJumpQ] = useState("");
  const [jumpErr, setJumpErr] = useState<string | null>(null);
  const [jumpBusy, setJumpBusy] = useState(false);
  const [jumpMobileOpen, setJumpMobileOpen] = useState(false);
  const [jumpDropOpen, setJumpDropOpen] = useState(false);
  const [jumpResults, setJumpResults] = useState<any[]>([]);
  const jumpBlurRef = React.useRef<number | null>(null);
  async function jumpToSymbol(raw: string) {
    const q = raw.trim().toUpperCase();
    if (!q) return;
    setJumpBusy(true);
    setJumpErr(null);
    try {
      const res = await fetch(`/api/asset/${encodeURIComponent(q)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setJumpErr(res.status === 404 ? "Not found" : "Error");
        return;
      }
      const a = json.asset as any;
      data.openFromSymbol(a.symbol, a.name ?? null, a.asset_type ?? null, a.racional_url ?? null, a);
    } catch {
      setJumpErr("Error");
    } finally {
      setJumpBusy(false);
    }
  }

  // Live dropdown: search beyond the top-1000 list.
  React.useEffect(() => {
    const q = jumpQ.trim();
    if (!q) { setJumpResults([]); return; }

    // Local suggestions first (within loaded top-1000).
    const ql = q.toLowerCase();
    const local = data.rows
      .filter((r) => r.symbol.toLowerCase().includes(ql) || (r.name ?? "").toLowerCase().includes(ql))
      .slice(0, 8);
    setJumpResults(local as any[]);

    // Remote suggestions (debounced) for anything beyond loaded list.
    const t = window.setTimeout(() => {
      fetch(`/api/assets/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((j) => {
          if (!j?.ok || !Array.isArray(j.results)) return;
          // Merge by symbol; keep local order first.
          const seen = new Set(local.map((x) => x.symbol));
          const merged = [...local, ...j.results.filter((x: any) => !seen.has(x.symbol))].slice(0, 8);
          setJumpResults(merged);
        })
        .catch(() => {});
    }, 120);
    return () => window.clearTimeout(t);
  }, [jumpQ, data.rows]);

  // Build context string for the AI — refreshed whenever holdings, prices or ranking change
  const chatContext = React.useMemo(() => {
    const parts: string[] = [];

    // Active tab — helps the AI understand what the user is looking at
    if (data.viewMode) {
      parts.push(`Active tab: ${data.viewMode}`);
    }

    // Portfolio positions with badges
    const activeHoldings = portfolio.holdings.filter((h) => !h.sold_at);
    if (activeHoldings.length > 0) {
      const lines = activeHoldings.map((h) => {
        const price = portfolio.latestPrices[h.symbol]?.price;
        const pnlPct =
          h.avg_cost && price ? (((price - h.avg_cost) / h.avg_cost) * 100).toFixed(1) : "n/a";
        const pnlAbs =
          h.avg_cost && price ? ((price - h.avg_cost) * h.shares).toFixed(0) : "n/a";
        const week7 = portfolio.weekChanges[h.symbol];
        const overbought = portfolio.techSignals[h.symbol];
        const pnlNum = pnlPct !== "n/a" ? parseFloat(pnlPct) : null;
        const badges: string[] = [];
        if (pnlNum !== null && pnlNum >= 20 && overbought) badges.push("💰 take-profit-signal");
        if (pnlNum !== null && pnlNum <= -20) badges.push("👁️ review-signal");
        if (week7 !== undefined && Math.abs(week7) >= 10) badges.push(`⚡ 7d=${week7.toFixed(1)}%`);
        const badgeStr = badges.length ? ` [${badges.join(", ")}]` : "";
        return `${h.symbol}: ${h.shares} shares @ $${h.avg_cost ?? "?"}, price $${price ?? "?"}, P&L ${pnlPct}% ($${pnlAbs})${badgeStr}`;
      });
      parts.push(`Portfolio (${activeHoldings.length} positions):\n${lines.join("\n")}`);

      // Diversification score
      if (portfolio.correlationData) {
        const divScore = computeDiversificationScore(portfolio.correlationData);
        parts.push(`Portfolio diversification score: ${divScore}/100 (100=uncorrelated, 0=all move together)`);
      }
    }

    // Full ranking context (score_delta + rs_spy + more fields)
    if (data.rows.length > 0) {
      const high = data.rows.filter((r) => (r.final_score ?? 0) >= 0.7);
      const top20 = data.rows.slice(0, 20);
      const seen = new Set(high.map((r) => r.symbol));
      const combined = [...high, ...top20.filter((r) => !seen.has(r.symbol))].slice(0, 25);
      // Build a CAGR lookup from compounders so ranking rows can show long-term returns
      const cagrMap = new Map(
        data.compoundRows.map((c) => [c.symbol, { cagr_1y: c.cagr_1y, cagr_3y: c.cagr_3y, cagr_5y: c.cagr_5y }])
      );
      const lines = combined.map((r) => {
        const cagr = cagrMap.get(r.symbol);
        return [
          `${r.symbol}`,
          `score=${r.final_score?.toFixed(3) ?? "?"}`,
          `Δ=${r.score_delta != null ? (r.score_delta > 0 ? "+" : "") + r.score_delta.toFixed(3) : "?"}`,
          `bucket=${r.bucket ?? "?"}`,
          `mom1m=${r.mom_1m?.toFixed(2) ?? "?"}`,
          `mom3m=${r.mom_3m?.toFixed(2) ?? "?"}`,
          `mom6m=${r.mom_6m?.toFixed(2) ?? "?"}`,
          `mom1y=${r.mom_1y?.toFixed(2) ?? "?"}`,
          `rs_spy=${r.rs_spy?.toFixed(2) ?? "?"}`,
          `tech=${r.tech_trend?.toFixed(1) ?? "?"}`,
          `liq=${r.liq_score?.toFixed(2) ?? "?"}`,
          cagr?.cagr_1y != null ? `cagr1y=${(cagr.cagr_1y * 100).toFixed(1)}%` : null,
          cagr?.cagr_3y != null ? `cagr3y=${(cagr.cagr_3y * 100).toFixed(1)}%` : null,
          cagr?.cagr_5y != null ? `cagr5y=${(cagr.cagr_5y * 100).toFixed(1)}%` : null,
        ].filter(Boolean).join(" ");
      });
      parts.push(`Ranking (High Conviction + top 20):\n${lines.join("\n")}`);
    }

    // Top turnarounds with more detail
    if (data.turnRows.length > 0) {
      const turns = data.turnRows.slice(0, 8).map(
        (r) =>
          `${r.symbol} rebound=${r.rebound_from_low?.toFixed(1) ?? "?"}% mom1m=${r.mom_1m?.toFixed(2) ?? "?"} mom3m=${r.mom_3m?.toFixed(2) ?? "?"} vol_surge=${r.vol_surge?.toFixed(1) ?? "?"}x`
      );
      parts.push(`Top turnarounds:\n${turns.join("\n")}`);
    }

    // Accumulation zone
    if (data.accumRows.length > 0) {
      const accum = data.accumRows.slice(0, 8).map(
        (r) =>
          `${r.symbol} above_52w_low=${r.pct_above_52w_low?.toFixed(1) ?? "?"}% from_52w_high=${r.pct_from_52w_high?.toFixed(1) ?? "?"}% mom1m=${r.mom_1m?.toFixed(2) ?? "?"} mom3m=${r.mom_3m?.toFixed(2) ?? "?"}`
      );
      parts.push(`Accumulation zone (top 8):\n${accum.join("\n")}`);
    }

    // Compounders — show all three CAGR horizons and top 15
    if (data.compoundRows.length > 0) {
      const cmps = data.compoundRows.slice(0, 15).map((r) => {
        const cagrParts = [
          r.cagr_1y != null ? `cagr1y=${(r.cagr_1y * 100).toFixed(1)}%` : null,
          r.cagr_3y != null ? `cagr3y=${(r.cagr_3y * 100).toFixed(1)}%` : null,
          r.cagr_5y != null ? `cagr5y=${(r.cagr_5y * 100).toFixed(1)}%` : null,
        ].filter(Boolean).join(" ");
        return `${r.symbol} ${cagrParts} pos_months=${r.pos_month_ratio != null ? (r.pos_month_ratio * 100).toFixed(0) + "%" : "?"} maxDD=${r.max_drawdown?.toFixed(1) ?? "?"}%`;
      });
      parts.push(`Compounders (${data.cmpHorizon}, top 15):\n${cmps.join("\n")}`);
    }

    // Currently viewed asset — full detail including Finnhub fundamentals
    if (data.selected) {
      const s = data.selected;
      const fields = [
        `symbol=${s.symbol}`,
        `name=${s.name ?? "?"}`,
        `score=${s.final_score?.toFixed(3) ?? "?"}`,
        `Δ=${s.score_delta != null ? (s.score_delta > 0 ? "+" : "") + s.score_delta.toFixed(3) : "?"}`,
        `bucket=${s.bucket ?? "?"}`,
        `mom1w=${s.mom_1w?.toFixed(2) ?? "?"}`,
        `mom1m=${s.mom_1m?.toFixed(2) ?? "?"}`,
        `mom3m=${s.mom_3m?.toFixed(2) ?? "?"}`,
        `mom6m=${s.mom_6m?.toFixed(2) ?? "?"}`,
        `mom1y=${s.mom_1y?.toFixed(2) ?? "?"}`,
        `rs_spy=${s.rs_spy?.toFixed(2) ?? "?"}`,
        `tech_trend=${s.tech_trend?.toFixed(1) ?? "?"}`,
        `liq=${s.liq_score?.toFixed(2) ?? "?"}`,
        s.sector ? `sector=${s.sector}` : null,
      ].filter(Boolean).join(" ");
      let detail = `Currently viewing: ${fields}`;
      if (data.finnhubData?.metrics) {
        const m = data.finnhubData.metrics;
        const q = data.finnhubData.quote;
        const fin = [
          m.marketCapitalization ? `marketCap=${(m.marketCapitalization / 1e3).toFixed(1)}B` : null,
          m.peBasicExclExtraTTM ? `P/E=${m.peBasicExclExtraTTM.toFixed(1)}` : null,
          m.epsBasicExclExtraItemsTTM ? `EPS=${m.epsBasicExclExtraItemsTTM.toFixed(2)}` : null,
          m.revenueGrowthTTMYoy ? `revGrowth=${(m.revenueGrowthTTMYoy).toFixed(1)}%` : null,
          m["52WeekHigh"] ? `52wHigh=${m["52WeekHigh"].toFixed(2)}` : null,
          m["52WeekLow"] ? `52wLow=${m["52WeekLow"].toFixed(2)}` : null,
          m.dividendYieldIndicatedAnnual ? `divYield=${m.dividendYieldIndicatedAnnual.toFixed(2)}%` : null,
          q ? `quote=${q.c.toFixed(2)} (${q.dp >= 0 ? "+" : ""}${q.dp.toFixed(2)}% today)` : null,
        ].filter(Boolean).join(" ");
        if (fin) detail += `\nFundamentals: ${fin}`;
        if (data.finnhubData.recommendation) {
          const r = data.finnhubData.recommendation;
          detail += `\nAnalyst consensus: strongBuy=${r.strongBuy} buy=${r.buy} hold=${r.hold} sell=${r.sell} strongSell=${r.strongSell} (${r.period})`;
        }
        if (data.finnhubData.ownership && data.finnhubData.ownership.length > 0) {
          const holders = data.finnhubData.ownership
            .map((h) => `${h.name} ${h.sharePercent.toFixed(2)}% (${h.change >= 0 ? "+" : ""}${h.change.toLocaleString()} shares, ${h.filingDate})`)
            .join("; ");
          detail += `\nTop institutional holders (whales): ${holders}`;
        }
      }
      parts.push(detail);
    }

    return parts.length > 0 ? parts.join("\n\n") : undefined;
  }, [
    data.viewMode,
    portfolio.holdings,
    portfolio.latestPrices,
    portfolio.weekChanges,
    portfolio.techSignals,
    portfolio.correlationData,
    data.rows,
    data.turnRows,
    data.accumRows,
    data.compoundRows,
    data.cmpHorizon,
    data.selected,
    data.finnhubData,
  ]);

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

  if (showOnboarding) {
    return <OnboardingScreen lang={lang} onDone={handleOnboardingDone} />;
  }

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
        valuationData={data.valuationData}
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
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex flex-row justify-between gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center gap-2 flex-none mr-1">
              <BulliaLogo dark={mounted && resolvedTheme === "dark"} />
              <span className="font-semibold text-2xl hidden sm:block">BULLIA</span>
            </div>
            {/* Tab bar: hidden on mobile (uses BottomNavBar) — visible on desktop */}
            <div className="hidden md:block">
              <SlidingTabBar viewMode={data.viewMode} setViewMode={data.setViewMode} lang={lang} />
            </div>
            {/* Global symbol search (desktop) */}
            <div className="hidden md:block">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  jumpToSymbol(jumpQ);
                }}
                className="relative"
              >
                <input
                  value={jumpQ}
                  onChange={(e) => setJumpQ(e.target.value)}
                  placeholder={lang === "es" ? "Buscar símbolo…" : "Search symbol…"}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-label={lang === "es" ? "Buscar símbolo" : "Search symbol"}
                  aria-expanded={jumpDropOpen && jumpResults.length > 0}
                  aria-controls="desktop-symbol-results"
                  className="w-44 lg:w-56 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-900 dark:border-neutral-700"
                  onFocus={() => {
                    if (jumpBlurRef.current) window.clearTimeout(jumpBlurRef.current);
                    setJumpDropOpen(true);
                  }}
                  onBlur={() => {
                    jumpBlurRef.current = window.setTimeout(() => setJumpDropOpen(false), 150);
                  }}
                />
                <button
                  type="submit"
                  disabled={jumpBusy}
                  title={lang === "es" ? "Ir" : "Go"}
                  aria-label={lang === "es" ? "Buscar" : "Search"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50"
                >
                  ↵
                </button>
                {jumpDropOpen && jumpResults.length > 0 && (
                  <ul id="desktop-symbol-results" className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-lg max-h-56 overflow-y-auto origin-top transition duration-150 animate-fadeIn">
                    {jumpResults.map((r: any) => (
                      <li key={r.symbol}>
                        <button
                          type="button"
                          onMouseDown={() => {
                            setJumpQ(r.symbol);
                            setJumpDropOpen(false);
                            jumpToSymbol(r.symbol);
                          }}
                          onClick={(event) => {
                            if (event.detail === 0) {
                              setJumpQ(r.symbol);
                              setJumpDropOpen(false);
                              jumpToSymbol(r.symbol);
                            }
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 focus-visible:bg-emerald-50 dark:hover:bg-neutral-800 dark:focus-visible:bg-emerald-950/40"
                        >
                          <span className="font-mono font-semibold w-16 shrink-0 text-xs">{r.symbol}</span>
                          <span className="text-gray-500 truncate text-xs">{r.name ?? "—"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {jumpErr && (
                  <div className="absolute left-0 top-full mt-1 text-[11px] text-red-500">
                    {jumpErr}
                  </div>
                )}
              </form>
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
                aria-label={t("reloadBtn", lang)}
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
                aria-label={t("legendTitle", lang)}
                className="w-8 h-8 rounded-lg border dark:border-neutral-600 text-sm font-bold hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all duration-150 active:scale-95 flex items-center justify-center"
              >
                ?
              </button>
            </div>
            {/* Mobile: symbol search toggle */}
            <button
              onClick={() => setJumpMobileOpen((v) => !v)}
              title={lang === "es" ? "Buscar símbolo" : "Search symbol"}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg border dark:border-neutral-600 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all duration-150 active:scale-95 text-gray-600 dark:text-gray-300"
              aria-label={lang === "es" ? "Buscar símbolo" : "Search symbol"}
              aria-expanded={jumpMobileOpen}
              aria-controls="mobile-symbol-search"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            </button>
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
                  aria-expanded={auth.showUserMenu}
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
                          aria-label={t("editProfile", lang)}
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

        {/* Mobile: expanded symbol search row (animated) */}
        <div
          id="mobile-symbol-search"
          className={`md:hidden grid transition-all duration-200 ease-out ${jumpMobileOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
        >
          <div className={`overflow-hidden max-w-[1400px] mx-auto px-4 ${jumpMobileOpen ? "py-3" : "py-0"} transition-all duration-200 ease-out`}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                jumpToSymbol(jumpQ);
              }}
              className="flex items-center gap-2 relative"
            >
              <input
                value={jumpQ}
                onChange={(e) => setJumpQ(e.target.value)}
                placeholder={lang === "es" ? "Buscar símbolo…" : "Search symbol…"}
                role="combobox"
                aria-autocomplete="list"
                aria-label={lang === "es" ? "Buscar símbolo" : "Search symbol"}
                aria-expanded={jumpDropOpen && jumpResults.length > 0}
                aria-controls="mobile-symbol-results"
                className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-900 dark:border-neutral-700"
                autoCapitalize="characters"
                onFocus={() => {
                  if (jumpBlurRef.current) window.clearTimeout(jumpBlurRef.current);
                  setJumpDropOpen(true);
                }}
                onBlur={() => {
                  jumpBlurRef.current = window.setTimeout(() => setJumpDropOpen(false), 150);
                }}
              />
              <button
                type="submit"
                disabled={jumpBusy}
                aria-label={lang === "es" ? "Buscar" : "Search"}
                className="rounded-xl px-3 py-2 text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60 transition-colors"
              >
                {lang === "es" ? "Ir" : "Go"}
              </button>
              {jumpDropOpen && jumpResults.length > 0 && (
                <div className="fixed flex flex-1 z-50 left-0 right-0 top-24 mt-6 bg-transparent pointer-events-none">
                  <div className="max-w-[1400px] mx-auto px-4 pointer-events-auto">
                    <ul id="mobile-symbol-results" className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-lg max-h-70 overflow-y-auto origin-top transition duration-150 animate-fadeIn">
                      {jumpResults.map((r: any) => (
                        <li key={r.symbol}>
                          <button
                            type="button"
                            onMouseDown={() => {
                              setJumpQ(r.symbol);
                              setJumpDropOpen(false);
                              jumpToSymbol(r.symbol);
                            }}
                            onClick={(event) => {
                              if (event.detail === 0) {
                                setJumpQ(r.symbol);
                                setJumpDropOpen(false);
                                jumpToSymbol(r.symbol);
                              }
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 focus-visible:bg-emerald-50 dark:hover:bg-neutral-800 dark:focus-visible:bg-emerald-950/40"
                          >
                            <span className="font-mono font-semibold w-16 shrink-0 text-xs">{r.symbol}</span>
                            <span className="text-gray-500 truncate text-xs">{r.name ?? "—"}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </form>
            {jumpErr && <div className="mt-1 text-[11px] text-red-500">{jumpErr}</div>}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[1400px] mx-auto px-4 py-6 pb-[164px] md:pb-6" style={{ paddingBottom: "calc(164px + env(safe-area-inset-bottom))" }}>
        {data.error && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            <span>Error: {data.error}</span>
            <button
              onClick={handleReload}
              className="shrink-0 rounded-lg border border-current px-2.5 py-1 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/30"
            >
              {lang === "es" ? "Reintentar" : "Retry"}
            </button>
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
            onAskFollowUp={(text) => { chat.sendMessage(text, chatContext); chat.setIsOpen(true); }}
          />
        )}

        {data.viewMode === "diary" && (
          <DiaryTab
            lang={lang}
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

        {data.viewMode === "value" && (
          <ValueQualityTab
            rows={data.valueRows}
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
            onBrowseRanking={() => data.setViewMode("ranking")}
            selectedSymbol={data.selected?.symbol}
            lang={lang}
          />
        )}
      </main>

      <BottomNavBar
        viewMode={data.viewMode}
        setViewMode={data.setViewMode}
        lang={lang}
        chatOpen={chat.isOpen}
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

      <footer className="max-w-[1400px] mx-auto px-4 py-10 text-xs text-gray-500">
        {t("footer", lang)}
      </footer>
    </div>
  );
}
