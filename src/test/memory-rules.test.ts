import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRIVACY,
  MAX_UPLOAD_BYTES,
  formatProfileNumber,
  missingProfileFields,
  parseProfileSlug,
  statusColor,
  validateBirthDate,
  validateMemoryFile,
  validateProofFile,
} from "@/lib/memory-rules";

describe("LifeEcho rules", () => {
  it("keeps new memories private until the owner shares them in their legacy", () => {
    expect(DEFAULT_PRIVACY).toBe("private");
  });

  it("numbers archived profiles as Profile 001, 002…", () => {
    expect(formatProfileNumber(1)).toBe("Profile 001");
    expect(formatProfileNumber(42)).toBe("Profile 042");
    expect(formatProfileNumber(1234)).toBe("Profile 1234");
    expect(parseProfileSlug("001")).toBe(1);
    expect(parseProfileSlug("abc")).toBeNull();
  });

  it("shows green for living members and black once a passing is verified", () => {
    expect(statusColor("active")).toBe("green");
    expect(statusColor("deceased")).toBe("black");
  });

  it("requires full name, date of birth, country and profile picture to register", () => {
    expect(missingProfileFields({ full_name: "A", date_of_birth: "1990-01-01", country: "FR", avatar_url: null })).toEqual([
      "profile picture",
    ]);
    expect(missingProfileFields({ full_name: "A", date_of_birth: "1990-01-01", country: "FR", avatar_url: "x" })).toEqual([]);
    expect(missingProfileFields(null)).toHaveLength(4);
  });

  it("rejects a date of birth in the future", () => {
    expect(validateBirthDate("2999-01-01", new Date("2026-01-01"))).not.toBeNull();
    expect(validateBirthDate("1980-05-05", new Date("2026-01-01"))).toBeNull();
  });

  it("limits uploads to 50 MB and matching media types", () => {
    expect(validateMemoryFile("photo", { type: "image/jpeg", size: MAX_UPLOAD_BYTES + 1 })).not.toBeNull();
    expect(validateMemoryFile("photo", { type: "image/jpeg", size: MAX_UPLOAD_BYTES })).toBeNull();
    expect(validateMemoryFile("video", { type: "image/png", size: 10 })).not.toBeNull();
    expect(validateMemoryFile("thought", null)).toBeNull();
  });

  it("requires formal proof (PDF or image) for a death verification", () => {
    expect(validateProofFile(null)).not.toBeNull();
    expect(validateProofFile({ type: "application/pdf", size: 1000 })).toBeNull();
    expect(validateProofFile({ type: "text/plain", size: 1000 })).not.toBeNull();
  });
});
