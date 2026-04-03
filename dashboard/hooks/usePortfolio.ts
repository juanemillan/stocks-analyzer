import { useState } from "react";
import { getLatestPrices, getPricesMulti } from "@/app/actions";
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
  const [correlationData, setCorrelationData] = useState<CorrelationResult | null>(null);;

  const dataDate = Object.values(latestPrices).map((v) => v.date).sort().at(-1) ?? null;

  async function loadHoldings() {
    setHoldingsLoading(true);
    const supabase = createClient();
    const { data: port } = await supabase
      .from("portfolios")
      .select("id")
      .limit(1)
      .single();
    if (!port) {
      setHoldings([]);
      setHoldingsLoading(false);
      return;
    }
    const { data } = await supabase
      .from("portfolio_assets")
      .select("id, symbol, shares, avg_cost")
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
    const { data: existing } = await supabase.from("portfolios").select("id").limit(1).single();
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

  return {
    holdings, holdingsLoading,
    latestPrices, dataDate,
    correlationData,
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
