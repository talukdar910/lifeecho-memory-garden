// Cinematic opening shown right after signing in.
export const INTRO_TOTAL_MS = 2200;
/** The screen is fully dark at this point, so the next page can load behind it. */
export const INTRO_COVER_MS = 320;

export const INTRO_EVENT = "lifeecho:intro";
const ARM_KEY = "lifeecho:intro-armed";
const ARM_TTL_MS = 10 * 60 * 1000;

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** Remembers to play the opening after a sign-in that leaves the page (Google / Lovable). */
export function armIntro() {
  try {
    sessionStorage.setItem(ARM_KEY, String(Date.now()));
  } catch {
    /* storage unavailable */
  }
}

export function takeArmedIntro(): boolean {
  try {
    const v = sessionStorage.getItem(ARM_KEY);
    sessionStorage.removeItem(ARM_KEY);
    return !!v && Date.now() - Number(v) < ARM_TTL_MS;
  } catch {
    return false;
  }
}

/** Starts the opening; resolves once the screen is dark so navigation happens unseen. */
export function playIntro(): Promise<void> {
  if (typeof window === "undefined" || prefersReducedMotion()) return Promise.resolve();
  window.dispatchEvent(new Event(INTRO_EVENT));
  return new Promise((resolve) => setTimeout(resolve, INTRO_COVER_MS));
}
