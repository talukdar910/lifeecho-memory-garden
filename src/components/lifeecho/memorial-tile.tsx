import { Link } from "@tanstack/react-router";
import { Globe2, Lock } from "lucide-react";
import { lifespan } from "@/lib/memory-rules";
import { LogoMark } from "./logo";

export function MemorialTile({
  m,
  coverUrl,
}: {
  m: { id: string; full_name: string; birth_date: string | null; death_date: string | null; epitaph: string | null; visibility: string; memoryCount?: number };
  coverUrl?: string | undefined;
}) {
  return (
    <Link
      to="/archive/$memorialId"
      params={{ memorialId: m.id }}
      className="glass-panel group block overflow-hidden rounded-2xl transition-all hover:-translate-y-1 hover:border-primary/40"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {coverUrl ? (
          <img src={coverUrl} alt={m.full_name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <LogoMark className="size-16 opacity-60" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-background/70 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
          {m.visibility === "public" ? <><Globe2 className="size-3 text-primary" /> Public</> : <><Lock className="size-3" /> Private</>}
        </span>
      </div>
      <div className="p-5">
        <p className="text-xs font-semibold tracking-wider text-primary">{lifespan(m.birth_date, m.death_date)}</p>
        <h3 className="mt-1 text-2xl font-semibold">{m.full_name}</h3>
        {m.epitaph && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground italic">"{m.epitaph}"</p>}
        {m.memoryCount !== undefined && (
          <p className="mt-3 text-xs text-muted-foreground">{m.memoryCount} {m.memoryCount === 1 ? "memory" : "memories"}</p>
        )}
      </div>
    </Link>
  );
}
