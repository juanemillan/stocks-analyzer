import { useState, useRef } from "react";
import { getLatestPrices, getPricesMulti, syncRacionalPortfolio, getPortfolioSnapshots } from "@/app/actions";
import type { PortfolioSnapshot } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import type { Holding } from "@/lib/stockUtils";
import { computeCorrelation, type CorrelationResult } from "@/lib/correlation";

/** Simple 14-period RSI using the last 15 data points. Returns null if insufficient data. */
function computeRSI14(prices: { close: number }[]): number | null {
  if (prices.length < 15) return null;
  const last15 = prices.slice(-15);
  let gains = 0, losses = 0;
  for (let i = 1; i < last15.length; i++) {
    const diff = last15[i].close - last15[i - 1].close;
    if (diff > 0) gains += diff; else losses += -diff;
  }
  const avgLoss = losses / 14;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + (gains / 14) / avgLoss);
}

/** Returns how many % the latest close is above its 20-day SMA. Positive = overextended. */
function computeSMA20Distance(prices: { close: number }[]): number | null {
  if (prices.length < 20) return null;
  const last20 = prices.slice(-20);
  const sma = last20.reduce((s, p) => s + p.close, 0) / 20;
  if (sma === 0) return null;
  return ((last20[last20.length - 1].close - sma) / sma) * 100;
}

export function usePortfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newShares, setNewShares] = useState("");
  const [newAvgCost, setNewAvgCost] = useState("");
  const [holdingError, setHoldingError] = useState<string | null>(null);
  const [symbolSearch, setSymbolSearch] = useState("");
  const [symDropOpen, setSymDropOpen] = useState(false);
  const [latestPrices, setLatestPrices] = useState<Record<string, { price: number; date: string }>>({});
  const [correlationData, setCorrelationData] = useState<CorrelationResult | null>(null);
  const [weekChanges, setWeekChanges] = useState<Record<string, number>>({});
  const [techSignals, setTechSignals] = useState<Record<string, boolean>>({});
  const [showConnectRacional, setShowConnectRacional] = useState(false);
  const [racionalSyncing, setRacionalSyncing] = useState(false);
  const [racionalSyncError, setRacionalSyncError] = useState<string | null>(null);
  const [racionalSyncInfo, setRacionalSyncInfo] = useState<string | null>(null);
  const [lastRacionalSync, setLastRacionalSync] = useState<Date | null>(null);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);

  const holdingsEverLoaded = useRef(false);

  const dataDate = Object.values(latestPrices).map((v) => v.date).sort().at(-1) ?? null;

  async function loadHoldings(force = false) {
    // Skip if already loaded unless explicitly forced (e.g. after a sync)
    if (!force && holdingsEverLoaded.current) return;
    holdingsEverLoaded.current = true;
    setHoldingsLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      getPortfolioSnapshots(user.id, 90).then(setSnapshots).catch(() => {});
    }
    const { data: port } = await supabase
      .from("portfolios")
      .select("id")
      .eq("user_id", user?.id ?? "")
      .limit(1)
      .single();
    if (!port) {
      setHoldings([]);
      setHoldingsLoading(false);
      return;
    }
    const { data } = await supabase
      .from("portfolio_assets")
      .select("id, symbol, shares, avg_cost, sold_at")
      .eq("portfolio_id", port.id)
      .order("symbol");
    const list = (data ?? []) as Holding[];
    setHoldings(list);
    if (list.length) {
      const prices = await getLatestPrices(list.map((h) => h.symbol));
      setLatestPrices(prices);
      if (list.length >= 2) {
        const priceMap = await getPricesMulti(list.map((h) => h.symbol), 90);
        setCorrelationData(computeCorrelation(priceMap));
        // Compute 7-day % change per symbol from the same price data
        const changes: Record<string, number> = {};
        for (const [sym, prices] of Object.entries(priceMap)) {
          if (prices.length >= 2) {
            const recent = prices.slice(-7);
            const oldest = recent[0].close;
            const newest = recent[recent.length - 1].close;
            if (oldest > 0) changes[sym] = ((newest - oldest) / oldest) * 100;
          }
        }
        setWeekChanges(changes);
        // Overbought signal: RSI-14 > 70 OR price more than 15% above SMA-20
        const signals: Record<string, boolean> = {};
        for (const [sym, priceData] of Object.entries(priceMap)) {
          const rsi = computeRSI14(priceData);
          const dist = computeSMA20Distance(priceData);
          signals[sym] = (rsi != null && rsi > 70) || (dist != null && dist > 15);
        }
        setTechSignals(signals);
      } else {
        setCorrelationData(null);
      }
    } else {
      setLatestPrices({});
      setCorrelationData(null);
    }
    setHoldingsLoading(false);
  }

  function closeAddModal() {
    setShowAddHolding(false);
    setNewSymbol(""); setNewShares(""); setNewAvgCost("");
    setSymbolSearch(""); setSymDropOpen(false);
    setHoldingError(null);
  }

  async function addHolding() {
    setHoldingError(null);
    if (!newSymbol.trim()) { setHoldingError("Symbol required"); return; }
    const sharesNum = parseFloat(newShares);
    if (isNaN(sharesNum) || sharesNum <= 0) { setHoldingError("Shares must be > 0"); return; }
    const supabase = createClient();
    let portId: string;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setHoldingError("Not authenticated"); return; }
    const { data: existing } = await supabase.from("portfolios").select("id").eq("user_id", user.id).limit(1).single();
    if (existing) {
      portId = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from("portfolios")
        .insert({ name: "My Portfolio", user_id: user.id })
        .select("id")
        .single();
      if (error || !created) { setHoldingError(error?.message ?? "Could not create portfolio"); return; }
      portId = created.id;
    }
    const { error } = await supabase.from("portfolio_assets").upsert({
      portfolio_id: portId,
      symbol: newSymbol.trim().toUpperCase(),
      shares: sharesNum,
      avg_cost: newAvgCost ? parseFloat(newAvgCost) : null,
    }, { onConflict: "portfolio_id,symbol" });
    if (error) { setHoldingError(error.message); return; }
    closeAddModal();
    loadHoldings(true);
  }

  async function removeHolding(id: string) {
    const supabase = createClient();
    await supabase.from("portfolio_assets").delete().eq("id", id);
    loadHoldings(true);
  }

  async function updateHolding(id: string, shares: number, avg_cost: number | null) {
    const supabase = createClient();
    await supabase.from("portfolio_assets").update({ shares, avg_cost }).eq("id", id);
    loadHoldings(true);
  }

  async function syncFromRacional(email: string, password: string, replaceSold: boolean) {
    setRacionalSyncing(true);
    setRacionalSyncError(null);
    setRacionalSyncInfo(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRacionalSyncError("Not authenticated"); setRacionalSyncing(false); return; }
    try {
      const result = await syncRacionalPortfolio(user.id, email, password, replaceSold);
      setLastRacionalSync(new Date());
      setShowConnectRacional(false);
      if (result.queued) {
        // GitHub Action dispatched — runs async (~2 min). Don't reload stale data yet.
        setRacionalSyncInfo("Sync iniciado en segundo plano. Los datos se actualizarán en ~2 minutos — recarga la página para verlos.");
      } else {
        await loadHoldings(true);
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Unknown error";
      const friendly =
        raw.includes("Contraseña incorrecta") || raw.includes("Email no registrado")
          ? raw
          : raw.includes("Login failed") || raw.includes("check credentials")
          ? "Email o contraseña incorrectos. Verifica tus credenciales de Racional."
          : raw.includes("GITHUB_TOKEN")
          ? "GITHUB_TOKEN no configurado. Agrégalo a las variables de entorno de Vercel."
          : raw.includes("workflow dispatch failed")
          ? "No se pudo iniciar el sync automático. Verifica GITHUB_TOKEN y GITHUB_REPO."
          : raw;
      setRacionalSyncError(friendly);
    }
    setRacionalSyncing(false);
  }

  return {
    holdings, holdingsLoading,
    latestPrices, dataDate,
    correlationData, weekChanges, techSignals,
    showConnectRacional, setShowConnectRacional,
    racionalSyncing, racionalSyncError, racionalSyncInfo, lastRacionalSync,
    syncFromRacional,
    showAddHolding, setShowAddHolding,
    newSymbol, setNewSymbol,
    newShares, setNewShares,
    newAvgCost, setNewAvgCost,
    holdingError, setHoldingError,
    symbolSearch, setSymbolSearch,
    symDropOpen, setSymDropOpen,
    snapshots,
    loadHoldings, addHolding, removeHolding, updateHolding, closeAddModal,
  };
}
