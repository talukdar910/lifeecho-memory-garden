import { Link } from "@tanstack/react-router";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="le-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--primary-glow)" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="5" fill="url(#le-g)" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="url(#le-g)" strokeWidth="1.5" opacity="0.6" />
      <circle cx="16" cy="16" r="14" fill="none" stroke="url(#le-g)" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="LifeEcho home">
      <LogoMark />
      <span className="font-display text-2xl font-semibold tracking-tight">
        Life<span className="text-aurora">Echo</span>
      </span>
    </Link>
  );
}
