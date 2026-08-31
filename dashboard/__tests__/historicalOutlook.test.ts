import { describe, expect, it } from "vitest";
import { buildHistoricalOutlook } from "@/lib/historicalOutlook";

describe("buildHistoricalOutlook", () => {
  it("returns historical ranges and risk metrics with enough price history", () => {
    const prices = Array.from({ length: 300 }, (_, i) => ({ date: `2024-${String(Math.floor(i / 28) + 1).padStart(2, "0")}-${String(i % 28 + 1).padStart(2, "0")}`, close: 100 + i * 0.2 + Math.sin(i) }));
    const outlook = buildHistoricalOutlook(prices, prices);
    expect(outlook?.oneMonth?.samples).toBeGreaterThan(30);
    expect(outlook?.threeMonths?.median).not.toBeNull();
    expect(outlook?.beta).toBeCloseTo(1, 1);
  });
});
