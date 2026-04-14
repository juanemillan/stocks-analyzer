type PriceSeries = { date: string; close: number }[];

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  if (n < 2) return 0;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da2 = 0, db2 = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    da2 += da * da;
    db2 += db * db;
  }
  const denom = Math.sqrt(da2 * db2);
  return denom === 0 ? 0 : num / denom;
}

export type CorrelationGroup = {
  symbols: string[];
  avgCorrelation: number;
};

export type CorrelationResult = {
  matrix: Record<string, Record<string, number>>;
  symbols: string[];
  groups: CorrelationGroup[];
  dataPoints: number;
};

/** Threshold above which two stocks are considered "highly correlated" */
const HIGH_CORR = 0.7;

export function computeCorrelation(
  priceMap: Record<string, PriceSeries>
): CorrelationResult | null {
  const symbols = Object.keys(priceMap).filter((s) => priceMap[s].length >= 10);
  if (symbols.length < 2) return null;

  // Align on dates present in ALL series
  const dateSets = symbols.map((s) => new Set(priceMap[s].map((p) => p.date)));
  const commonDates = [...dateSets[0]]
    .filter((d) => dateSets.every((ds) => ds.has(d)))
    .sort();

  if (commonDates.length < 11) return null; // need at least 10 return points

  // Build aligned close array per symbol
  const closes: Record<string, number[]> = {};
  for (const sym of symbols) {
    const byDate: Record<string, number> = {};
    for (const p of priceMap[sym]) byDate[p.date] = p.close;
    closes[sym] = commonDates.map((d) => byDate[d]);
  }

  // Log returns
  const returns: Record<string, number[]> = {};
  for (const sym of symbols) {
    const c = closes[sym];
    returns[sym] = c.slice(1).map((v, i) => Math.log(v / c[i]));
  }

  // Pairwise Pearson matrix
  const matrix: Record<string, Record<string, number>> = {};
  for (const a of symbols) {
    matrix[a] = {};
    for (const b of symbols) {
      matrix[a][b] = a === b ? 1 : parseFloat(pearson(returns[a], returns[b]).toFixed(3));
    }
  }

  // Cluster high-correlation pairs using union-find
  const parent: Record<string, string> = {};
  function find(x: string): string {
    if (!parent[x]) parent[x] = x;
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  function union(x: string, y: string) {
    parent[find(x)] = find(y);
  }
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      if (matrix[symbols[i]][symbols[j]] >= HIGH_CORR) {
        union(symbols[i], symbols[j]);
      }
    }
  }

  // Collect clusters of size ≥ 2
  const clusterMap: Record<string, string[]> = {};
  for (const sym of symbols) {
    const root = find(sym);
    if (!clusterMap[root]) clusterMap[root] = [];
    clusterMap[root].push(sym);
  }

  const groups: CorrelationGroup[] = Object.values(clusterMap)
    .filter((g) => g.length >= 2)
    .map((g) => {
      // Average of all pairwise correlations within the group
      let sum = 0;
      let count = 0;
      for (let i = 0; i < g.length; i++) {
        for (let j = i + 1; j < g.length; j++) {
          sum += matrix[g[i]][g[j]];
          count++;
        }
      }
      return { symbols: g, avgCorrelation: parseFloat((sum / count).toFixed(3)) };
    })
    .sort((a, b) => b.avgCorrelation - a.avgCorrelation);

  return { matrix, symbols, groups, dataPoints: commonDates.length - 1 };
}

/** Color a cell by correlation value: 0 → white, 1 → deep red/orange */
export function corrColor(r: number): string {
  if (r >= 0.9) return "bg-red-200 dark:bg-red-900/50";
  if (r >= 0.7) return "bg-orange-100 dark:bg-orange-900/40";
  if (r >= 0.4) return "bg-yellow-50 dark:bg-yellow-900/20";
  return "bg-white dark:bg-neutral-800";
}

/**
 * Diversification score 0–100 based on the average pairwise correlation.
 * 100 = perfectly uncorrelated (ideal), 0 = all holdings move together.
 */
export function computeDiversificationScore(result: CorrelationResult): number {
  const { matrix, symbols } = result;
  if (symbols.length < 2) return 100;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      sum += matrix[symbols[i]][symbols[j]];
      count++;
    }
  }
  const avgCorr = count > 0 ? sum / count : 0;
  // avgCorr in [-1, 1]; map [0,1] → score [100,0], clamp
  return Math.round(Math.max(0, Math.min(100, (1 - avgCorr) * 100)));
}
