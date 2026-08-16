import type { RankRow } from "@/app/types";
import type { CorrelationResult } from "@/lib/correlation";
import type { Holding } from "@/lib/stockUtils";

export type PortfolioDiagnosis = {
  activeCount: number;
  totalValue: number;
  topPosition: { symbol: string; weight: number } | null;
  sectors: { name: string; weight: number; symbols: string[] }[];
  highCorrelationGroups: { symbols: string[]; correlation: number }[];
  scoreBuckets: Record<"high" | "watch" | "low" | "unknown", string[]>;
};

export function buildPortfolioDiagnosis(
  holdings: Holding[],
  latestPrices: Record<string, { price: number }>,
  rows: RankRow[],
  correlationData: CorrelationResult | null,
): PortfolioDiagnosis {
  const active = holdings.filter((holding) => !holding.sold_at);
  const bySymbol = new Map(rows.map((row) => [row.symbol, row]));
  const values = active.map((holding) => ({ ...holding, value: (latestPrices[holding.symbol]?.price ?? 0) * holding.shares }));
  const totalValue = values.reduce((sum, holding) => sum + holding.value, 0);
  const top = [...values].sort((a, b) => b.value - a.value)[0];
  const sectors = new Map<string, { value: number; symbols: string[] }>();
  const scoreBuckets: PortfolioDiagnosis["scoreBuckets"] = { high: [], watch: [], low: [], unknown: [] };

  for (const holding of values) {
    const row = bySymbol.get(holding.symbol);
    const name = row?.sector || "Sin sector";
    const sector = sectors.get(name) ?? { value: 0, symbols: [] };
    sector.value += holding.value;
    sector.symbols.push(holding.symbol);
    sectors.set(name, sector);
    const score = row?.final_score;
    if (score == null) scoreBuckets.unknown.push(holding.symbol);
    else if (score >= 0.7) scoreBuckets.high.push(holding.symbol);
    else if (score >= 0.5) scoreBuckets.watch.push(holding.symbol);
    else scoreBuckets.low.push(holding.symbol);
  }

  return {
    activeCount: active.length,
    totalValue,
    topPosition: top && totalValue > 0 ? { symbol: top.symbol, weight: top.value / totalValue } : null,
    sectors: [...sectors.entries()].map(([name, sector]) => ({ name, symbols: sector.symbols, weight: totalValue > 0 ? sector.value / totalValue : 0 })).sort((a, b) => b.weight - a.weight),
    highCorrelationGroups: (correlationData?.groups ?? []).map((group) => ({ symbols: group.symbols, correlation: group.avgCorrelation })),
    scoreBuckets,
  };
}
