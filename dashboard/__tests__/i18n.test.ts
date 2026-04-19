import { describe, it, expect } from "vitest";
import { t, LABELS } from "@/app/i18n";

// ─── t() helper ──────────────────────────────────────────────────────────────

describe("t()", () => {
  it("returns the Spanish string for a known key", () => {
    expect(t("reloadBtn", "es")).toBe("Recargar");
  });

  it("returns the English string for a known key", () => {
    expect(t("reloadBtn", "en")).toBe("Reload");
  });

  it("returns undefined for an unknown lang (no runtime fallback)", () => {
    // @ts-expect-error — intentionally passing an invalid lang
    expect(t("reloadBtn", "fr")).toBeUndefined();
  });
});

// ─── LABELS completeness ─────────────────────────────────────────────────────

describe("LABELS", () => {
  it("every label has both es and en translations", () => {
    const missing: string[] = [];
    for (const [key, val] of Object.entries(LABELS)) {
      if (!val.es || !val.en) missing.push(key);
    }
    expect(missing).toEqual([]);
  });

  it("no label has an empty string for either language", () => {
    const empty: string[] = [];
    for (const [key, val] of Object.entries(LABELS)) {
      if ((val.es as string) === "" || (val.en as string) === "") empty.push(key);
    }
    expect(empty).toEqual([]);
  });
});
