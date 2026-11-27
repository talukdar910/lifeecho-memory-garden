import { describe, expect, it } from "vitest";
import { signInDestination } from "@/lib/sign-in-destination";

describe("Sign-in destination", () => {
  it("opens the living-member community after a normal sign-in", () => {
    expect(signInDestination()).toBe("/community");
  });
  it("preserves a requested Archive memorial", () => {
    expect(signInDestination("/archive/001")).toBe("/archive/001");
  });
  it("does not return to sign-in or an external address", () => {
    for (const path of ["/auth", "/auth?redirect=/auth", "//other.example", "https://other.example", "/reset-password"]) {
      expect(signInDestination(path)).toBe("/community");
    }
  });
});