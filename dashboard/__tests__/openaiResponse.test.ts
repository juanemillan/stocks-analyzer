import { describe, expect, it } from "vitest";
import { responseOutputText } from "@/lib/openaiResponse";

describe("responseOutputText", () => {
  it("extracts text from the raw Responses API message output", () => {
    expect(responseOutputText({ output: [{ type: "message", content: [{ type: "output_text", text: "Resumen" }] }] })).toBe("Resumen");
  });
});
