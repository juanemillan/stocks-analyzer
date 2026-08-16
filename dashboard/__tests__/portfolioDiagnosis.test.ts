import { describe, expect, it } from "vitest";
import { buildPortfolioDiagnosis } from "@/lib/portfolioDiagnosis";

describe("buildPortfolioDiagnosis", () => {
  it("groups exposure, scores, and correlated holdings from existing data", () => {
    const result = buildPortfolioDiagnosis(
      [{ id: "1", symbol: "AAA", shares: 2, avg_cost: 10, sold_at: null }, { id: "2", symbol: "BBB", shares: 1, avg_cost: 10, sold_at: null }],
      { AAA: { price: 20 }, BBB: { price: 10 } },
      [{ symbol: "AAA", sector: "Tech", final_score: 0.8 }, { symbol: "BBB", sector: "Health", final_score: 0.4 }] as never,
      { groups: [{ symbols: ["AAA", "BBB"], avgCorrelation: 0.8 }], matrix: {}, symbols: ["AAA", "BBB"], dataPoints: 60 },
    );
    expect(result.topPosition).toEqual({ symbol: "AAA", weight: 0.8 });
    expect(result.sectors[0]).toMatchObject({ name: "Tech", weight: 0.8 });
    expect(result.scoreBuckets).toMatchObject({ high: ["AAA"], low: ["BBB"] });
    expect(result.highCorrelationGroups[0].correlation).toBe(0.8);
  });
});
