// Business rules for the Memory Archive. Kept pure so they can be unit-tested.

export const MEMORY_KINDS = ["story", "photo", "video", "audio"] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];

export type Visibility = "private" | "public";

/** Memorials are private until their owner chooses to share them. */
export const DEFAULT_VISIBILITY: Visibility = "private";

/** Largest single file a member can upload (matches the storage limit). */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const ACCEPT: Record<MemoryKind, string> = {
  story: "",
  photo: "image/*",
  video: "video/*",
  audio: "audio/*",
};

export function acceptFor(kind: MemoryKind): string {
  return ACCEPT[kind];
}

export const KIND_LABEL: Record<MemoryKind, string> = {
  story: "Story",
  photo: "Photo",
  video: "Video",
  audio: "Audio",
};

export const KIND_PLURAL: Record<MemoryKind, string> = {
  story: "Stories",
  photo: "Photos",
  video: "Videos",
  audio: "Audio",
};

/** Returns an error message, or null when the file is allowed for this kind of memory. */
export function validateMemoryFile(
  kind: MemoryKind,
  file: { type: string; size: number } | null | undefined,
): string | null {
  if (kind === "story") return null;
  if (!file) return `Please choose a ${KIND_LABEL[kind].toLowerCase()} file.`;
  const prefix = ACCEPT[kind].replace("*", "");
  if (!file.type.startsWith(prefix)) {
    return `That file isn't a ${KIND_LABEL[kind].toLowerCase()}.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) return "Files must be 50 MB or smaller.";
  return null;
}

export interface NewMemorialInput {
  full_name: string;
  birth_date?: string | null;
  death_date?: string | null;
  birthplace?: string | null;
  epitaph?: string | null;
  biography?: string | null;
  visibility?: Visibility;
}

export function newMemorialPayload(input: NewMemorialInput, ownerId: string) {
  const clean = (v?: string | null) => (v && v.trim() ? v.trim() : null);
  return {
    owner_id: ownerId,
    full_name: input.full_name.trim(),
    birth_date: clean(input.birth_date),
    death_date: clean(input.death_date),
    birthplace: clean(input.birthplace),
    epitaph: clean(input.epitaph),
    biography: clean(input.biography),
    visibility: input.visibility ?? DEFAULT_VISIBILITY,
  };
}

/** "1942 — 2021", or just one year when only one date is known. */
export function lifespan(birth?: string | null, death?: string | null): string {
  const y = (d?: string | null) => (d ? d.slice(0, 4) : "");
  const b = y(birth);
  const d = y(death);
  if (b && d) return `${b} — ${d}`;
  if (b) return `Born ${b}`;
  if (d) return `Passed ${d}`;
  return "";
}

export function fileExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  const ext = idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : "bin";
}
