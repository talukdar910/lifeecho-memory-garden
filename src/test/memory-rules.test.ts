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
  validateSignup,
  validateDeathDate,
  canViewMemory,
  validateLegacyContact,
  PRIVACY_OPTIONS,
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

  it("requires full name, valid email, 8+ character password, date of birth and country to sign up", () => {
    const ok = { fullName: "Ana Ruiz", email: "ana@example.com", password: "12345678", dateOfBirth: "1990-02-03", country: "ES" };
    const today = new Date("2026-01-01");
    expect(validateSignup(ok, today)).toBeNull();
    expect(validateSignup({ ...ok, fullName: " " }, today)).not.toBeNull();
    expect(validateSignup({ ...ok, email: "ana" }, today)).not.toBeNull();
    expect(validateSignup({ ...ok, password: "1234567" }, today)).not.toBeNull();
    expect(validateSignup({ ...ok, dateOfBirth: "" }, today)).not.toBeNull();
    expect(validateSignup({ ...ok, country: "" }, today)).not.toBeNull();
  });

  it("rejects a date of passing in the future", () => {
    const today = new Date("2026-01-01");
    expect(validateDeathDate("2026-06-01", today)).not.toBeNull();
    expect(validateDeathDate("2025-12-31", today)).toBeNull();
    expect(validateDeathDate("", today)).not.toBeNull();
  });

  it("offers exactly three visibility options: Only me, Legacy and Public", () => {
    expect([...PRIVACY_OPTIONS]).toEqual(["private", "legacy", "public"]);
  });

  it("shows Only me memories to the owner alone", () => {
    const m = { privacy: "private", hidden: false };
    expect(canViewMemory(m, { isOwner: true, ownerVerifiedDeceased: false, isLegacyContact: false })).toBe(true);
    expect(canViewMemory(m, { isOwner: false, ownerVerifiedDeceased: true, isLegacyContact: true })).toBe(false);
  });

  it("shows Legacy memories only to designated contacts after a verified passing", () => {
    const m = { privacy: "legacy", hidden: false };
    expect(canViewMemory(m, { isOwner: false, ownerVerifiedDeceased: false, isLegacyContact: true })).toBe(false);
    expect(canViewMemory(m, { isOwner: false, ownerVerifiedDeceased: true, isLegacyContact: false })).toBe(false);
    expect(canViewMemory(m, { isOwner: false, ownerVerifiedDeceased: true, isLegacyContact: true })).toBe(true);
  });

  it("shows Public memories to everyone unless an admin hid them", () => {
    const visitor = { isOwner: false, ownerVerifiedDeceased: false, isLegacyContact: false };
    expect(canViewMemory({ privacy: "public", hidden: false }, visitor)).toBe(true);
    expect(canViewMemory({ privacy: "public", hidden: true }, visitor)).toBe(false);
  });

  it("rejects invalid, duplicate or own email as a legacy contact", () => {
    expect(validateLegacyContact("Sam@Example.com ", "me@example.com", [])).toBeNull();
    expect(validateLegacyContact("not-an-email", "me@example.com", [])).not.toBeNull();
    expect(validateLegacyContact("ME@example.com", "me@example.com", [])).not.toBeNull();
    expect(validateLegacyContact("sam@example.com", "me@example.com", ["sam@example.com"])).not.toBeNull();
  });
});
