import { useState } from "react";
import { getLatestPrices, getPricesMulti, syncRacionalPortfolio } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import type { Holding } from "@/lib/stockUtils";
import { computeCorrelation, type CorrelationResult } from "@/lib/correlation";

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
  const [showConnectRacional, setShowConnectRacional] = useState(false);
  const [racionalSyncing, setRacionalSyncing] = useState(false);
  const [racionalSyncError, setRacionalSyncError] = useState<string | null>(null);
  const [lastRacionalSync, setLastRacionalSync] = useState<Date | null>(null);

  const dataDate = Object.values(latestPrices).map((v) => v.date).sort().at(-1) ?? null;

  async function loadHoldings() {
    setHoldingsLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
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
    loadHoldings();
  }

  async function removeHolding(id: string) {
    const supabase = createClient();
    await supabase.from("portfolio_assets").delete().eq("id", id);
    loadHoldings();
  }

  async function syncFromRacional(email: string, password: string, replaceSold: boolean) {
    setRacionalSyncing(true);
    setRacionalSyncError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRacionalSyncError("Not authenticated"); setRacionalSyncing(false); return; }
    try {
      await syncRacionalPortfolio(user.id, email, password, replaceSold);
      setLastRacionalSync(new Date());
      setShowConnectRacional(false);
      await loadHoldings();
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Unknown error";
      // Map common server-side messages to friendlier copy
      const friendly =
        raw.includes("Contraseña incorrecta") || raw.includes("Email no registrado")
          ? raw  // already human-readable from firebase_login()
          : raw.includes("Login failed") || raw.includes("check credentials")
          ? "Email o contraseña incorrectos. Verifica tus credenciales de Racional."
          : raw.includes("fetch failed") || raw.includes("ECONNREFUSED") || raw.includes("network")
          ? "No se pudo conectar al servidor local. ¿Está corriendo api_server.py?"
          : raw.includes("SYNC_KEY")
          ? "SYNC_KEY no configurado en .env.local del dashboard."
          : raw;
      setRacionalSyncError(friendly);
    }
    setRacionalSyncing(false);
  }

  return {
    holdings, holdingsLoading,
    latestPrices, dataDate,
    correlationData,
    showConnectRacional, setShowConnectRacional,
    racionalSyncing, racionalSyncError, lastRacionalSync,
    syncFromRacional,
    showAddHolding, setShowAddHolding,
    newSymbol, setNewSymbol,
    newShares, setNewShares,
    newAvgCost, setNewAvgCost,
    holdingError, setHoldingError,
    symbolSearch, setSymbolSearch,
    symDropOpen, setSymDropOpen,
    loadHoldings, addHolding, removeHolding, closeAddModal,
  };
}
