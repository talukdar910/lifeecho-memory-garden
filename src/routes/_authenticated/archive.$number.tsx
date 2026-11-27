import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemoryCard } from "@/components/lifeecho/memory-card";
import { StatusBadge } from "@/components/lifeecho/status-badge";
import { archiveEntryQuery, ensureCompleteProfile, archiveListQuery, legacyMemoriesQuery, useMediaUrls, type ArchiveEntry } from "@/lib/archive";
import marble from "@/assets/memorial-marble.asset.json";
import { countryName } from "@/lib/locales";
import { formatProfileNumber, lifespan, parseProfileSlug, profileSlug } from "@/lib/memory-rules";

export const Route = createFileRoute("/_authenticated/archive/$number")({
  head: () => ({
    meta: [
      { title: "Archived profile — LifeEcho Memory Archive" },
      { name: "description", content: "A life and legacy preserved in the LifeEcho Memory Archive." },
      { property: "og:title", content: "Archived profile — LifeEcho Memory Archive" },
      { property: "og:description", content: "A life and legacy preserved in the LifeEcho Memory Archive." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context, params }) => {
    const n = parseProfileSlug(params.number);
    if (!n) throw notFound();
    await ensureCompleteProfile(context.queryClient);
    const [entry] = await Promise.all([
      context.queryClient.ensureQueryData(archiveEntryQuery(n)),
      context.queryClient.ensureQueryData(archiveListQuery()),
    ]);
    if (!entry) throw notFound();
    await context.queryClient.ensureQueryData(legacyMemoriesQuery(entry.person_id));
    return { n };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="text-4xl font-semibold">Profile not found</h1>
      <Button asChild variant="glass" className="mt-6">
        <Link to="/archive">Back to the archive</Link>
      </Button>
    </div>
  ),
  component: ArchivedProfile,
});

function ArchivedProfile() {
  const { n } = Route.useLoaderData();
  const { data: entry } = useSuspenseQuery(archiveEntryQuery(n));
  if (!entry) return <div className="memorial p-10 text-center">This memorial is unavailable.</div>;
  return <MemorialProfile entry={entry} />;
}

function MemorialProfile({ entry: e }: { entry: ArchiveEntry }) {
  const { data: list } = useSuspenseQuery(archiveListQuery());
  const { data: memories } = useSuspenseQuery(legacyMemoriesQuery(e.person_id));
  const { data: urls } = useMediaUrls([e.avatar_path, ...memories.map((m) => m.media_path)]);
  const idx = list.findIndex((x) => x.profile_number === e.profile_number);
  const prev = idx > 0 ? list[idx - 1] : undefined;
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : undefined;

  const initials = e.full_name.split(" ").filter(Boolean).slice(0, 2).map((w) => w.charAt(0)).join("");

  return (
    <div className="memorial min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-10 md:py-14">
        <Link to="/archive" className="text-sm text-memorial-muted hover:text-memorial-foreground">
          ← Memory Archive
        </Link>
        <section className="mt-8 flex flex-col items-center text-center" aria-label="Memorial inscription">
          <div className="memorial-stone relative isolate w-full max-w-xl overflow-hidden px-6 pt-12 pb-14 sm:px-12 sm:pt-16">
          <img src={marble.url} alt="Polished dark marble with natural veins" className="absolute inset-0 -z-10 size-full object-cover" />
          <div className="memorial-stone-inlay absolute inset-4 -z-10 sm:inset-6" />
          <Sprout aria-hidden className="mx-auto mb-6 size-8 text-memorial-gold" strokeWidth={1} />
          <p className="mb-7 text-lg text-memorial-gold italic">In loving memory</p>
          <div className="mx-auto flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-memorial-gold/50 bg-memorial text-4xl text-memorial-gold grayscale sm:size-36">
            {e.avatar_path && urls?.[e.avatar_path] ? (
              <img src={urls[e.avatar_path]} alt={e.full_name} className="size-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <h1 className="memorial-inscription mt-7 text-4xl leading-tight font-medium break-words sm:text-5xl">{e.full_name}</h1>
          <p className="mt-3 text-lg text-memorial-muted italic">
            {[lifespan(e.date_of_birth, e.date_of_death), countryName(e.country)].filter(Boolean).join(" · ")}
          </p>
          <div className="memorial-rule mx-auto mt-7 w-36" />
          <p className="mt-6 text-xl text-memorial-gold italic">Forever remembered</p>
          <p className="mt-3 text-sm text-memorial-muted">{formatProfileNumber(e.profile_number)}</p>
          </div>
          <div aria-hidden className="memorial-plinth h-4 w-full max-w-[38rem]" />
          <div className="mt-6"><StatusBadge status="deceased" /></div>
          {e.biography && (
            <p className="mt-8 max-w-2xl text-xl leading-relaxed whitespace-pre-line">{e.biography}</p>
          )}
        </section>

        <div className="mt-14 text-center"><Sprout aria-hidden className="mx-auto size-5 text-memorial-gold" strokeWidth={1} />
        <h2 className="mt-3 text-4xl font-medium">A life, in memories</h2>
        <div className="memorial-rule mx-auto mt-4 w-24" /></div>
        {memories.length === 0 ? (
          <p className="mt-4 text-center text-memorial-muted italic">
            No memories are shared with you here. Legacy memories are visible only to the contacts this member chose.
          </p>
        ) : (
          <div className="mt-8 columns-1 gap-4 space-y-4 sm:columns-2">
            {memories.map((m) => (
              <MemoryCard key={m.id} memory={m} url={m.media_path ? urls?.[m.media_path] : undefined} showPrivacy reportable />
            ))}
          </div>
        )}

        <nav className="mt-16 flex flex-wrap justify-between gap-3 border-t border-memorial-line pt-6">
          {prev ? (
            <Button asChild variant="ghost">
              <Link to="/archive/$number" params={{ number: profileSlug(prev.profile_number) }}>
                <ArrowLeft /> Visit Previous Profile
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {next && (
            <Button asChild variant="ghost">
              <Link to="/archive/$number" params={{ number: profileSlug(next.profile_number) }}>
                Next Profile <ArrowRight />
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </div>
  );
}
