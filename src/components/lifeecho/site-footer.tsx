import { LogoMark } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-muted-foreground md:flex-row">
        <div className="flex items-center gap-2">
          <LogoMark className="size-6" />
          <span className="font-display text-lg text-foreground">LifeEcho</span>
        </div>
        <p className="font-display text-base tracking-wide text-foreground/80 italic">Your Life. Your Emotions. Your Legacy.</p>
        <p>© {new Date().getFullYear()} LifeEcho</p>
      </div>
    </footer>
  );
}
