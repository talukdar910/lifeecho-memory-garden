import { Link } from "@tanstack/react-router";
import emblem from "@/assets/logo-emblem.png";

/** Tree of life inside echo rings. */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return <img src={emblem} alt="" aria-hidden="true" className={`${className} rounded-full object-cover mix-blend-screen`} />;
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="LifeEcho home">
      <LogoMark className="size-9" />
      <span className="font-display text-2xl font-semibold tracking-tight">
        Life<span className="text-aurora">Echo</span>
      </span>
    </Link>
  );
}
