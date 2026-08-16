import { describe, expect, it } from "vitest";
import { dashboardLoadError } from "@/lib/userError";

describe("dashboardLoadError", () => {
  it("hides database connection details", () => {
    expect(dashboardLoadError(new Error("timeout exceeded when trying to connect"))).toBe("No pudimos conectar con los datos de mercado. Intenta nuevamente.");
  });
  it("returns a session-specific message", () => {
    expect(dashboardLoadError(new Error("Unauthorized"))).toBe("Tu sesión expiró. Inicia sesión nuevamente.");
  });
});
