export type HistoricalOutlook = {
  observations: number;
  return1y: number | null;
  volatility: number | null;
  maxDrawdown: number | null;
  beta: number | null;
  oneMonth: Range | null;
  threeMonths: Range | null;
};

type Point = { date: string; close: number };
type Range = { low: number; median: number; high: number; positiveRate: number; samples: number };

const percentile = (values: number[], p: number) => values[Math.min(values.length - 1, Math.max(0, Math.round((values.length - 1) * p)))];

function range(prices: Point[], days: number): Range | null {
  const returns = prices.slice(days).map((point, index) => point.close / prices[index].close - 1).filter(Number.isFinite).sort((a, b) => a - b);
  if (returns.length < 30) return null;
  return { low: percentile(returns, 0.1), median: percentile(returns, 0.5), high: percentile(returns, 0.9), positiveRate: returns.filter((value) => value > 0).length / returns.length, samples: returns.length };
}

export function buildHistoricalOutlook(prices: Point[], benchmark: Point[]): HistoricalOutlook | null {
  const clean = prices.filter((point) => Number.isFinite(point.close) && point.close > 0);
  if (clean.length < 126) return null;
  const daily = clean.slice(1).map((point, index) => point.close / clean[index].close - 1);
  const mean = daily.reduce((sum, value) => sum + value, 0) / daily.length;
  const variance = daily.reduce((sum, value) => sum + (value - mean) ** 2, 0) / daily.length;
  let peak = clean[0].close, maxDrawdown = 0;
  for (const point of clean) { peak = Math.max(peak, point.close); maxDrawdown = Math.min(maxDrawdown, point.close / peak - 1); }
  const benchmarkByDate = new Map(benchmark.map((point) => [point.date, point.close]));
  const paired = clean.filter((point, index) => index > 0 && benchmarkByDate.has(point.date) && benchmarkByDate.has(clean[index - 1].date)).map((point, index) => ({ stock: point.close / clean[index].close - 1, market: benchmarkByDate.get(point.date)! / benchmarkByDate.get(clean[index].date)! - 1 }));
  const marketMean = paired.reduce((sum, value) => sum + value.market, 0) / paired.length;
  const marketVariance = paired.reduce((sum, value) => sum + (value.market - marketMean) ** 2, 0) / paired.length;
  const covariance = paired.reduce((sum, value) => sum + (value.stock - mean) * (value.market - marketMean), 0) / paired.length;
  return { observations: clean.length, return1y: clean.length > 252 ? clean.at(-1)!.close / clean.at(-253)!.close - 1 : null, volatility: Math.sqrt(variance) * Math.sqrt(252), maxDrawdown, beta: paired.length >= 60 && marketVariance > 0 ? covariance / marketVariance : null, oneMonth: range(clean, 21), threeMonths: range(clean, 63) };
}
