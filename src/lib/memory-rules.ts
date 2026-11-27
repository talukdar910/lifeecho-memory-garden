// LifeEcho business rules. Pure functions so they can be unit-tested.

export const MEMORY_KINDS = ["story", "experience", "thought", "photo", "video", "audio"] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];
export const TEXT_KINDS: readonly MemoryKind[] = ["story", "experience", "thought"];

export const KIND_LABEL: Record<MemoryKind, string> = {
  story: "Story",
  experience: "Experience",
  thought: "Thought",
  photo: "Photo",
  video: "Video",
  audio: "Audio",
};
export const KIND_PLURAL: Record<MemoryKind, string> = {
  story: "Stories",
  experience: "Experiences",
  thought: "Thoughts",
  photo: "Photos",
  video: "Videos",
  audio: "Audio",
};

export const PRIVACY_OPTIONS = ["private", "legacy", "public"] as const;
export type Privacy = (typeof PRIVACY_OPTIONS)[number];
/** New memories stay with their owner until they choose to share them. */
export const DEFAULT_PRIVACY: Privacy = "private";
export const PRIVACY_LABEL: Record<Privacy, string> = {
  private: "Only me",
  legacy: "Legacy",
  public: "Public",
};
export const PRIVACY_HINT: Record<Privacy, string> = {
  private: "Private to you unless you change it.",
  legacy: "Shown to your legacy contacts only after your passing is formally verified.",
  public: "Anyone can see it. Make it private or delete it at any time.",
};

export interface ViewContext {
  isOwner: boolean;
  isAdmin?: boolean;
  /** The owner's passing was verified and their archive profile is published. */
  ownerVerifiedDeceased: boolean;
  /** The viewer's email is on the owner's legacy contact list. */
  isLegacyContact: boolean;
}
/** Who may see a memory. Mirrors the database rules. */
export function canViewMemory(memory: { privacy: string; hidden: boolean }, ctx: ViewContext): boolean {
  if (ctx.isOwner || ctx.isAdmin) return true;
  if (memory.hidden) return false;
  if (memory.privacy === "public") return true;
  if (memory.privacy === "legacy") return ctx.ownerVerifiedDeceased && ctx.isLegacyContact;
  return false;
}

/** Legacy contacts are stored as trimmed, lower-case emails; you can't name yourself. */
export function normalizeContactEmail(value: string): string {
  return value.trim().toLowerCase();
}
export function validateLegacyContact(email: string, ownEmail: string, existing: string[]): string | null {
  const e = normalizeContactEmail(email);
  if (!/^\S+@\S+\.\S+$/.test(e)) return "Please enter a valid email address.";
  if (e === normalizeContactEmail(ownEmail)) return "You can't add yourself as a legacy contact.";
  if (existing.map(normalizeContactEmail).includes(e)) return "This person is already one of your legacy contacts.";
  return null;
}

export const EMOTIONS = ["joy", "love", "gratitude", "pride", "hope", "nostalgia", "grief", "peace"] as const;
export type Emotion = (typeof EMOTIONS)[number];
export const EMOTION_LABEL: Record<Emotion, string> = {
  joy: "Joy",
  love: "Love",
  gratitude: "Gratitude",
  pride: "Pride",
  hope: "Hope",
  nostalgia: "Nostalgia",
  grief: "Grief",
  peace: "Peace",
};

/** Largest single file a member can upload (matches the storage limit). */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_PROOF_BYTES = 20 * 1024 * 1024;

const ACCEPT: Record<MemoryKind, string> = {
  story: "",
  experience: "",
  thought: "",
  photo: "image/*",
  video: "video/*",
  audio: "audio/*",
};

export function acceptFor(kind: MemoryKind): string {
  return ACCEPT[kind];
}

export function isTextKind(kind: string): boolean {
  return (TEXT_KINDS as readonly string[]).includes(kind);
}

/** Returns an error message, or null when the file is allowed for this kind of memory. */
export function validateMemoryFile(
  kind: MemoryKind,
  file: { type: string; size: number } | null | undefined,
): string | null {
  if (isTextKind(kind)) return null;
  if (!file) return `Please choose a ${KIND_LABEL[kind].toLowerCase()} file.`;
  const prefix = ACCEPT[kind].replace("*", "");
  if (!file.type.startsWith(prefix)) return `That file isn't a ${KIND_LABEL[kind].toLowerCase()}.`;
  if (file.size > MAX_UPLOAD_BYTES) return "Files must be 50 MB or smaller.";
  return null;
}

/** Proof of death: a PDF or an image, up to 20 MB. */
export function validateProofFile(file: { type: string; size: number } | null | undefined): string | null {
  if (!file) return "Please attach a death certificate or other official proof.";
  if (!(file.type === "application/pdf" || file.type.startsWith("image/"))) return "Proof must be a PDF or an image.";
  if (file.size > MAX_PROOF_BYTES) return "Proof documents must be 20 MB or smaller.";
  return null;
}

/** Archived profiles are numbered: 1 → "Profile 001". */
export function formatProfileNumber(n: number): string {
  return `Profile ${String(n).padStart(3, "0")}`;
}
export function profileSlug(n: number): string {
  return String(n).padStart(3, "0");
}
export function parseProfileSlug(slug: string): number | null {
  if (!/^\d{1,9}$/.test(slug)) return null;
  const n = Number(slug);
  return n > 0 ? n : null;
}

export type ProfileStatus = "active" | "inactive" | "deceased";
/** Green while alive and active; black once a passing is verified. */
export function statusColor(status: string | null | undefined): "green" | "black" {
  return status === "deceased" ? "black" : "green";
}

export interface ProfileLike {
  full_name: string | null;
  date_of_birth: string | null;
  country: string | null;
  avatar_url: string | null;
}
/** Registration requires full name, date of birth, country and a profile picture. */
export function missingProfileFields(p: ProfileLike | null | undefined): string[] {
  if (!p) return ["full name", "date of birth", "country", "profile picture"];
  const missing: string[] = [];
  if (!p.full_name?.trim()) missing.push("full name");
  if (!p.date_of_birth) missing.push("date of birth");
  if (!p.country) missing.push("country");
  if (!p.avatar_url) missing.push("profile picture");
  return missing;
}

export function validateBirthDate(value: string, today = new Date()): string | null {
  if (!value) return "Please enter your date of birth.";
  const d = new Date(value + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return "Please enter a valid date.";
  if (d > today) return "Date of birth can't be in the future.";
  if (d.getUTCFullYear() < 1900) return "Please enter a valid date of birth.";
  return null;
}

/** "1942 — 2021", or one year when only one date is known. */
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

export const MIN_PASSWORD_LENGTH = 8;

export interface SignupInput {
  fullName: string;
  email: string;
  password: string;
  dateOfBirth: string;
  country: string;
}
/** Registration: full name, email, password, date of birth and country are all required. */
export function validateSignup(input: SignupInput, today = new Date()): string | null {
  if (!input.fullName.trim()) return "Please enter your full name.";
  if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) return "Please enter a valid email address.";
  if (input.password.length < MIN_PASSWORD_LENGTH) return `Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`;
  const dob = validateBirthDate(input.dateOfBirth, today);
  if (dob) return dob;
  if (!input.country) return "Please choose your country.";
  return null;
}

/** The date of passing must be a real date that isn't in the future. */
export function validateDeathDate(value: string, today = new Date()): string | null {
  if (!value) return "Please enter the date of passing.";
  const d = new Date(value + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return "Please enter a valid date.";
  if (d > today) return "The date of passing can't be in the future.";
  return null;
}

export type DeathReportStatus = "pending" | "approved" | "rejected";
export const REPORT_STATUS_LABEL: Record<DeathReportStatus, string> = {
  pending: "Awaiting review",
  approved: "Verified — added to the archive",
  rejected: "Not approved",
};

/** Readers see memories in their chosen language, else their browser's, else English. */
export const SUPPORTED_LANGUAGE_CODES = [
  "en", "fr", "es", "pt", "de", "it", "nl", "ar", "bn", "hi", "ur", "zh", "ja", "ko", "ru", "tr", "fa", "sw",
  "id", "ms", "th", "vi", "pl", "uk", "ro", "el", "he", "sv", "no", "da", "fi", "cs", "hu", "ta", "te", "pa",
  "am", "yo", "ha", "zu", "tl", "ne",
] as const;
export function isSupportedLanguage(code: string | null | undefined): boolean {
  return !!code && (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(code);
}
export function resolveReaderLanguage(preferred: string | null | undefined, browser: string | null | undefined): string {
  if (isSupportedLanguage(preferred)) return preferred!;
  const base = browser?.toLowerCase().split("-")[0];
  if (base === "nb" || base === "nn") return "no";
  if (isSupportedLanguage(base)) return base!;
  return "en";
}
/** A saved translation is reused only while the memory hasn't been edited since. */
export function isTranslationFresh(memoryUpdatedAt: string, translatedFrom: string | null | undefined): boolean {
  if (!translatedFrom) return false;
  return new Date(translatedFrom).getTime() >= new Date(memoryUpdatedAt).getTime();
}

export const MIN_REPORT_REASON = 3;
export function validateReportReason(reason: string): string | null {
  if (reason.trim().length < MIN_REPORT_REASON) return "Please tell us briefly what is wrong.";
  if (reason.length > 1000) return "Please keep it under 1000 characters.";
  return null;
}

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  "death_report.submitted": "Passing reported",
  "death_report.approved": "Passing verified",
  "death_report.rejected": "Passing report rejected",
  "content.reported": "Memory reported",
  "content.hidden": "Memory hidden",
  "content.restored": "Memory restored",
  "content.report_dismissed": "Report dismissed",
  "archive.published": "Archive profile shown",
  "archive.unpublished": "Archive profile hidden",
  "role.admin_granted": "Admin access given",
  "role.admin_removed": "Admin access removed",
};
export function auditLabel(action: string): string {
  return AUDIT_ACTION_LABEL[action] ?? action;
}

/** Community comments: 1–1000 characters after trimming. */
export const MAX_COMMENT_LENGTH = 1000;
export function validateComment(body: string): string | null {
  const t = body.trim();
  if (!t) return "Write something first.";
  if (t.length > MAX_COMMENT_LENGTH) return `Comments can be up to ${MAX_COMMENT_LENGTH} characters.`;
  return null;
}
