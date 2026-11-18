import { describe, expect, it } from "vitest";
import {
  DEFAULT_VISIBILITY,
  MAX_UPLOAD_BYTES,
  newMemorialPayload,
  validateMemoryFile,
} from "@/lib/memory-rules";

describe("Memory Archive rules", () => {
  it("creates memorials as private unless the owner makes them public", () => {
    expect(DEFAULT_VISIBILITY).toBe("private");
    expect(newMemorialPayload({ full_name: "Ada" }, "u1").visibility).toBe("private");
    expect(newMemorialPayload({ full_name: "Ada", visibility: "public" }, "u1").visibility).toBe(
      "public",
    );
  });

  it("limits uploads to 50 MB", () => {
    expect(MAX_UPLOAD_BYTES).toBe(52428800);
    expect(validateMemoryFile("photo", { type: "image/jpeg", size: MAX_UPLOAD_BYTES + 1 })).not.toBeNull();
    expect(validateMemoryFile("photo", { type: "image/jpeg", size: MAX_UPLOAD_BYTES })).toBeNull();
  });

  it("only accepts matching media for photos, videos and audio", () => {
    expect(validateMemoryFile("video", { type: "image/png", size: 10 })).not.toBeNull();
    expect(validateMemoryFile("audio", { type: "audio/mpeg", size: 10 })).toBeNull();
    expect(validateMemoryFile("video", { type: "video/mp4", size: 10 })).toBeNull();
  });

  it("does not require a file for written stories", () => {
    expect(validateMemoryFile("story", null)).toBeNull();
  });
});
