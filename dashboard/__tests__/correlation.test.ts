import { describe, it, expect } from "vitest";
import {
  computeCorrelation,
  computeDiversificationScore,
  corrColor,
} from "@/lib/correlation";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build a synthetic price series with a deterministic trend */
function makeSeries(
  symbol: string,
  len: number,
  start = 100,
  step = 1
): [string, { date: string; close: number }[]] {
  const data = Array.from({ length: len }, (_, i) => ({
    date: `2024-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    close: start + i * step,
  }));
  return [symbol, data];
}

/** Jitter a series slightly so it's not identical to its source */
function jitter(
  series: { date: string; close: number }[],
  scale = 0.001
): { date: string; close: number }[] {
  return series.map((p, i) => ({ ...p, close: p.close * (1 + Math.sin(i) * scale) }));
}

// ─── pearson / computeCorrelation ───────────────────────────────────────────

describe("computeCorrelation", () => {
  it("returns null when fewer than 2 symbols with enough data", () => {
    const [sym, series] = makeSeries("AAPL", 20);
    expect(computeCorrelation({ [sym]: series })).toBeNull();
  });

  it("returns null when common dates are fewer than 11", () => {
    const [, s1] = makeSeries("A", 8);
    const [, s2] = makeSeries("B", 8);
    // Both have same dates but only 8 points → < 11 common
    expect(computeCorrelation({ A: s1, B: s2 })).toBeNull();
  });

  it("returns a result for two aligned series with enough points", () => {
    const [, base] = makeSeries("A", 30);
    const result = computeCorrelation({ A: base, B: jitter(base) });
    expect(result).not.toBeNull();
    expect(result!.symbols).toHaveLength(2);
    expect(result!.dataPoints).toBeGreaterThanOrEqual(10);
  });

  it("diagonal of correlation matrix is 1", () => {
    const [, base] = makeSeries("X", 30);
    const result = computeCorrelation({ X: base, Y: jitter(base) })!;
    expect(result.matrix["X"]["X"]).toBe(1);
    expect(result.matrix["Y"]["Y"]).toBe(1);
  });

  it("matrix is symmetric", () => {
    const [, base] = makeSeries("P", 30);
    const series2 = jitter(base, 0.05);
    const result = computeCorrelation({ P: base, Q: series2 })!;
    expect(result.matrix["P"]["Q"]).toBe(result.matrix["Q"]["P"]);
  });

  it("two identical series have correlation 1", () => {
    const [, base] = makeSeries("A", 30);
    const result = computeCorrelation({ A: base, B: [...base] })!;
    // pearson of identical returns = 1
    expect(result.matrix["A"]["B"]).toBeCloseTo(1, 2);
  });

  it("groups highly correlated pairs", () => {
    const [, base] = makeSeries("A", 30);
    // B is almost identical → correlation > 0.7
    const bSeries = jitter(base, 0.0001);
    const result = computeCorrelation({ A: base, B: bSeries })!;
    expect(result.groups.length).toBeGreaterThan(0);
    expect(result.groups[0].symbols).toEqual(expect.arrayContaining(["A", "B"]));
  });
});

// ─── computeDiversificationScore ────────────────────────────────────────────

describe("computeDiversificationScore", () => {
  it("returns 100 for fewer than 2 symbols", () => {
    const [, base] = makeSeries("A", 30);
    const result = computeCorrelation({ A: base, B: [...base] })!;
    // Fake a single-symbol result
    const single = { ...result, symbols: ["A"] };
    expect(computeDiversificationScore(single)).toBe(100);
  });

  it("returns ~0 when all pairs are perfectly correlated (r=1)", () => {
    const [, base] = makeSeries("A", 30);
    const result = computeCorrelation({ A: base, B: [...base] })!;
    // Matrix with r≈1 → score ≈ 0
    expect(computeDiversificationScore(result)).toBeLessThanOrEqual(5);
  });

  it("score is clamped between 0 and 100", () => {
    const [, base] = makeSeries("A", 30);
    const r = computeCorrelation({ A: base, B: jitter(base, 0.5) })!;
    const score = computeDiversificationScore(r);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ─── corrColor ───────────────────────────────────────────────────────────────

describe("corrColor", () => {
  it("returns red class for r >= 0.9", () => {
    expect(corrColor(0.95)).toContain("red");
    expect(corrColor(1.0)).toContain("red");
  });

  it("returns orange class for 0.7 <= r < 0.9", () => {
    expect(corrColor(0.75)).toContain("orange");
    expect(corrColor(0.7)).toContain("orange");
  });

  it("returns yellow class for 0.4 <= r < 0.7", () => {
    expect(corrColor(0.5)).toContain("yellow");
    expect(corrColor(0.4)).toContain("yellow");
  });

  it("returns neutral class for r < 0.4", () => {
    const cls = corrColor(0.1);
    expect(cls).not.toContain("red");
    expect(cls).not.toContain("orange");
    expect(cls).not.toContain("yellow");
  });
});
