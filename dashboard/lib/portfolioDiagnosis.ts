import type { RankRow } from "@/app/types";
import type { CorrelationResult } from "@/lib/correlation";
import type { Holding } from "@/lib/stockUtils";

export type PortfolioDiagnosis = {
  activeCount: number;
  totalValue: number;
  topPosition: { symbol: string; weight: number } | null;
  sectors: { name: string; weight: number; symbols: string[] }[];
  highCorrelationPairs: { symbols: [string, string]; correlation: number }[];
  positions: { symbol: string; weight: number | null; sector: string | null; score: number | null }[];
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
    highCorrelationPairs: correlationData ? correlationData.symbols.flatMap((symbol, index) =>
      correlationData.symbols.slice(index + 1).flatMap((other) => {
        const correlation = correlationData.matrix[symbol]?.[other];
        return correlation != null && correlation >= 0.7 ? [{ symbols: [symbol, other] as [string, string], correlation }] : [];
      }),
    ).sort((a, b) => b.correlation - a.correlation) : [],
    positions: values.map((holding) => {
      const row = bySymbol.get(holding.symbol);
      return { symbol: holding.symbol, weight: totalValue > 0 && holding.value > 0 ? holding.value / totalValue : null, sector: row?.sector ?? null, score: row?.final_score ?? null };
    }).sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)),
    scoreBuckets,
  };
}
