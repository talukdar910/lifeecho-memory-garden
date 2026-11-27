import { useCallback, useEffect, useRef, useState } from "react";
import emblem from "@/assets/logo-emblem.png";
import { useAuth } from "@/lib/auth-context";
import { INTRO_EVENT, INTRO_TOTAL_MS, prefersReducedMotion, takeArmedIntro } from "@/lib/intro";

const WAVE_DELAYS = ["0.35s", "0.6s", "0.85s"];

/** Full-screen opening: dark fade, glowing emblem with echo waves, slogan, then fade into the app. */
export function OpeningIntro() {
  const { user } = useAuth();
  const [run, setRun] = useState(0);
  const startedAt = useRef(0);

  const start = useCallback(() => {
    if (prefersReducedMotion()) return;
    // Ignore a second trigger for the same sign-in.
    if (Date.now() - startedAt.current < 600) return;
    startedAt.current = Date.now();
    setRun((r) => r + 1);
  }, []);

  useEffect(() => {
    window.addEventListener(INTRO_EVENT, start);
    return () => window.removeEventListener(INTRO_EVENT, start);
  }, [start]);

  useEffect(() => {
    if (user && takeArmedIntro()) start();
  }, [user, start]);

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!run) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), INTRO_TOTAL_MS);
    return () => clearTimeout(t);
  }, [run]);

  if (!visible) return null;
  return (
    <div
      key={run}
      role="status"
      aria-label="Opening LifeEcho"
      className="intro-overlay pointer-events-none fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
    >
      <div className="relative flex flex-col items-center px-6 text-center">
        <div className="relative flex size-[clamp(8rem,34vw,12rem)] items-center justify-center">
          <span aria-hidden className="intro-glow absolute -inset-[60%] rounded-full blur-2xl" />
          {WAVE_DELAYS.map((d) => (
            <span
              key={d}
              aria-hidden
              className="intro-wave absolute inset-0 rounded-full"
              style={{ animationDelay: d }}
            />
          ))}
          <img
            src={emblem}
            alt=""
            className="intro-logo relative size-full rounded-full object-cover mix-blend-screen"
          />
        </div>
        <p className="intro-text mt-10 font-display text-3xl font-semibold tracking-[0.18em] text-foreground md:text-4xl">
          LIFE<span className="text-aurora">ECHO</span>
        </p>
        <p
          className="intro-text mt-3 text-[0.7rem] font-medium tracking-[0.18em] text-muted-foreground uppercase md:text-xs"
          style={{ animationDelay: "0.12s" }}
        >
          Your Life. Your Emotions. Your Legacy.
        </p>
      </div>
    </div>
  );
}
