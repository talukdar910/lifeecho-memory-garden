import { describe, expect, it } from "vitest";
import { canManageContribution, DEFAULT_PRIVACY, sortMemoryTimeline } from "@/lib/memory-rules";

describe("memorial timelines", () => {
  it("orders memories by event date, with undated memories last", () => {
    const memories = [
      { id: "video", memory_date: "2001-05-01", created_at: "2026-01-01" },
      { id: "undated", memory_date: null, created_at: "2020-01-01" },
      { id: "photo", memory_date: "1980-06-12", created_at: "2026-02-01" },
    ];
    expect(sortMemoryTimeline(memories).map((m) => m.id)).toEqual(["photo", "video", "undated"]);
    expect(memories[0]?.id).toBe("video");
  });
  it("keeps new memorial contributions Only me until shared", () => {
    expect(DEFAULT_PRIVACY).toBe("private");
  });
  it("allows only the contribution author to manage it, never another visitor", () => {
    expect(canManageContribution("family", "family")).toBe(true);
    expect(canManageContribution("family", "visitor")).toBe(false);
    expect(canManageContribution("family", null)).toBe(false);
  });
});