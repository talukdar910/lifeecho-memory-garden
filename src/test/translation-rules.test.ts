import { describe, expect, it } from "vitest";
import { isTranslationFresh, resolveReaderLanguage, validateReportReason } from "@/lib/memory-rules";
import { INTRO_TOTAL_MS } from "@/lib/intro";

describe("reader language", () => {
  it("uses the language the reader chose in their profile first", () => {
    expect(resolveReaderLanguage("fr", "de-DE")).toBe("fr");
  });
  it("falls back to the browser language, then English", () => {
    expect(resolveReaderLanguage(null, "es-MX")).toBe("es");
    expect(resolveReaderLanguage("xx", "qq")).toBe("en");
  });
});

describe("saved translations", () => {
  it("are reused only if the memory was not edited after translating", () => {
    expect(isTranslationFresh("2026-01-01T10:00:00Z", "2026-01-01T10:00:00Z")).toBe(true);
    expect(isTranslationFresh("2026-01-02T10:00:00Z", "2026-01-01T10:00:00Z")).toBe(false);
    expect(isTranslationFresh("2026-01-01T10:00:00Z", null)).toBe(false);
  });
});

describe("reporting a memory", () => {
  it("needs a short reason", () => {
    expect(validateReportReason("  ")).not.toBeNull();
    expect(validateReportReason("Contains private details")).toBeNull();
  });
});

describe("opening animation", () => {
  it("lasts 2.2 seconds in total", () => {
    expect(INTRO_TOTAL_MS).toBe(2200);
  });
});
