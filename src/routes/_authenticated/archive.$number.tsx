import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemorialTimeline } from "@/components/lifeecho/memorial-timeline";
import { StatusBadge } from "@/components/lifeecho/status-badge";
import { archiveEntryQuery, archiveMemoriesQuery, ensureCompleteProfile, archiveListQuery, legacyMemoriesQuery, useMediaUrls, type ArchiveEntry } from "@/lib/archive";
import marble from "@/assets/memorial-marble.asset.json";
import { countryName } from "@/lib/locales";
import { formatProfileNumber, lifespan, parseProfileSlug, profileSlug } from "@/lib/memory-rules";

export const Route = createFileRoute("/_authenticated/archive/$number")({
  loader: async ({ context, params }) => {
    const n = parseProfileSlug(params.number);
    if (!n) throw notFound();
    await ensureCompleteProfile(context.queryClient);
    const [entry] = await Promise.all([
      context.queryClient.ensureQueryData(archiveEntryQuery(n)),
      context.queryClient.ensureQueryData(archiveListQuery()),
    ]);
    if (!entry) throw notFound();
    await Promise.all([
      context.queryClient.ensureQueryData(legacyMemoriesQuery(entry.person_id)),
      context.queryClient.ensureQueryData(archiveMemoriesQuery(entry.id)),
    ]);
    return { n, name: entry.full_name };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Memorial"} — LifeEcho Memory Archive` },
      { name: "description", content: `Remember ${loaderData?.name ?? "a life"} through stories, photos and videos in the LifeEcho Memory Archive.` },
      { property: "og:title", content: `${loaderData?.name ?? "Memorial"} — LifeEcho Memory Archive` },
      { property: "og:description", content: `Remember ${loaderData?.name ?? "a life"} through stories, photos and videos in the LifeEcho Memory Archive.` },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: ({ error }) => <div role="alert" className="memorial px-5 py-16 text-center">{error instanceof Error ? error.message : "This memorial could not be loaded."}</div>,
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
  const { data: urls } = useMediaUrls([e.avatar_path]);
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

        <MemorialTimeline entry={e} />

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
