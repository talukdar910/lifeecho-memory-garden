import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Search, Sprout } from "lucide-react";
import { Input } from "@/components/ui/input";
import marble from "@/assets/memorial-marble.asset.json";
import { useSuspenseQuery } from "@tanstack/react-query";
import { archiveListQuery, ensureCompleteProfile, useMediaUrls } from "@/lib/archive";
import { countryName } from "@/lib/locales";
import { formatProfileNumber, lifespan, profileSlug } from "@/lib/memory-rules";

export const Route = createFileRoute("/_authenticated/archive/")({
  head: () => ({
    meta: [
      { title: "LifeEcho Memory Archive" },
      { name: "description", content: "Numbered profiles of members whose lives and legacies are preserved on LifeEcho." },
      { property: "og:title", content: "LifeEcho Memory Archive" },
      { property: "og:description", content: "Every life leaves an echo. Visit the preserved legacies of LifeEcho members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    await ensureCompleteProfile(context.queryClient);
    await context.queryClient.ensureQueryData(archiveListQuery());
  },
  component: ArchivePage,
});

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w.charAt(0)).join("");
}

function ArchivePage() {
  const { data: entries } = useSuspenseQuery(archiveListQuery());
  const { data: urls } = useMediaUrls(entries.map((e) => e.avatar_path));
  const [search, setSearch] = useState("");
  const shown = entries.filter((e) => `${e.full_name} ${countryName(e.country)} ${formatProfileNumber(e.profile_number)}`.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="memorial min-h-screen">
      <section className="relative isolate overflow-hidden border-b border-memorial-line">
        <img src={marble.url} alt="" className="absolute inset-0 -z-10 size-full object-cover opacity-30" />
        <div className="mx-auto max-w-6xl px-5 py-12 text-center md:py-16">
        <Sprout aria-hidden className="mx-auto mb-5 size-8 text-memorial-gold" strokeWidth={1} />
        <p className="text-sm text-memorial-gold italic">In loving memory</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-5xl leading-tight font-medium md:text-6xl">LifeEcho Memory Archive</h1>
        <div className="memorial-rule mx-auto mt-6 w-40" />
        <p className="mx-auto mt-6 max-w-xl text-lg text-memorial-muted italic">
          Every name, a life. Every memory, a lasting echo.
        </p>
        <p className="mt-5 text-sm text-memorial-muted">{entries.length} lives remembered</p>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-5 py-8 md:py-10">
        <div className="mx-auto max-w-md relative">
          <Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-memorial-muted" />
          <Input aria-label="Find a memorial" placeholder="Find a name, country or profile number…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-12 border-memorial-line bg-memorial pl-10 text-memorial-foreground placeholder:text-memorial-muted" />
        </div>
        {entries.length === 0 ? (
          <p className="mt-12 text-memorial-muted">No archived profiles yet.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-8 min-[440px]:grid-cols-2 lg:grid-cols-4">
            {shown.map((e) => (
              <Link
                key={e.id}
                to="/archive/$number"
                params={{ number: profileSlug(e.profile_number) }}
                className="memorial-directory-stone group relative isolate flex min-w-0 flex-col items-center overflow-hidden px-4 pt-8 pb-6 text-center transition-colors hover:border-memorial-gold/60"
              >
                <img src={marble.url} alt="" loading="lazy" className="absolute inset-0 -z-10 size-full object-cover opacity-60" />
                <Sprout aria-hidden className="mb-4 size-4 text-memorial-gold" strokeWidth={1} />
                <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-memorial-gold/50 bg-memorial text-xl text-memorial-gold grayscale">
                  {e.avatar_path && urls?.[e.avatar_path] ? (
                    <img src={urls[e.avatar_path]} alt={e.full_name} className="size-full object-cover" />
                  ) : (
                    initials(e.full_name)
                  )}
                </div>
                <div className="mt-4 flex min-w-0 flex-1 flex-col items-center">
                  <h2 className="memorial-inscription text-2xl leading-tight font-medium break-words">{e.full_name}</h2>
                  <p className="mt-2 text-sm text-memorial-muted italic">
                    {[lifespan(e.date_of_birth, e.date_of_death), countryName(e.country)].filter(Boolean).join(" · ")}
                  </p>
                  <div className="memorial-rule my-4 w-16" />
                  <p className="mt-auto text-xs text-memorial-gold">{formatProfileNumber(e.profile_number)}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm text-memorial-muted group-hover:text-memorial-gold">Visit memorial <ArrowUpRight className="size-3" /></span>
                </div>
              </Link>
            ))}
          </div>
        )}
        {entries.length > 0 && shown.length === 0 && <p className="py-12 text-center text-memorial-muted">No memorials match “{search}”.</p>}
      </div>
    </div>
  );
}
