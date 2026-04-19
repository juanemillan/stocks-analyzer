import { describe, it, expect } from "vitest";
import { bucketColor, bucketDisplay, fmtBig, logoSrc } from "@/lib/stockUtils";

// ─── bucketColor ─────────────────────────────────────────────────────────────

describe("bucketColor", () => {
  it("returns green classes for Alta Convicción", () => {
    expect(bucketColor("Alta Convicción")).toContain("green");
  });

  it("returns amber classes for Vigilancia", () => {
    expect(bucketColor("Vigilancia")).toContain("amber");
  });

  it("returns red classes for Descartar", () => {
    expect(bucketColor("Descartar")).toContain("red");
  });

  it("returns gray for unknown bucket", () => {
    expect(bucketColor("Unknown")).toContain("gray");
  });
});

// ─── bucketDisplay ───────────────────────────────────────────────────────────

describe("bucketDisplay", () => {
  it("translates Alta Convicción to English", () => {
    expect(bucketDisplay("Alta Convicción", "en")).toBe("High Conviction");
  });

  it("keeps Spanish for es lang", () => {
    expect(bucketDisplay("Alta Convicción", "es")).toBe("Alta Convicción");
  });

  it("translates Vigilancia to Watch in English", () => {
    expect(bucketDisplay("Vigilancia", "en")).toBe("Watch");
  });

  it("translates Descartar to Discard in English", () => {
    expect(bucketDisplay("Descartar", "en")).toBe("Discard");
  });

  it("returns the raw value for an unknown bucket", () => {
    expect(bucketDisplay("Foo", "en")).toBe("Foo");
  });
});

// ─── fmtBig ──────────────────────────────────────────────────────────────────

describe("fmtBig", () => {
  it("formats billions with B suffix", () => {
    expect(fmtBig(1_500_000_000)).toBe("1.50B");
  });

  it("formats millions with M suffix", () => {
    expect(fmtBig(2_400_000)).toBe("2.40M");
  });

  it("formats thousands with K suffix", () => {
    expect(fmtBig(3_500)).toBe("3.5K");
  });

  it("formats small numbers with 2 decimal places", () => {
    expect(fmtBig(42.5)).toBe("42.50");
  });

  it("handles negative billions", () => {
    expect(fmtBig(-2_000_000_000)).toBe("-2.00B");
  });

  it("handles negative millions", () => {
    expect(fmtBig(-1_500_000)).toBe("-1.50M");
  });

  it("handles negative thousands", () => {
    expect(fmtBig(-4_000)).toBe("-4.0K");
  });

  it("handles zero", () => {
    expect(fmtBig(0)).toBe("0.00");
  });
});

// ─── logoSrc ─────────────────────────────────────────────────────────────────

describe("logoSrc", () => {
  it("returns the logo API path for a symbol", () => {
    expect(logoSrc("AAPL")).toBe("/api/logo/AAPL");
  });

  it("URL-encodes symbols with special characters", () => {
    expect(logoSrc("BRK.B")).toBe("/api/logo/BRK.B");
    expect(logoSrc("A B")).toBe("/api/logo/A%20B");
  });
});
