import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemoryCard } from "@/components/lifeecho/memory-card";
import { StatusBadge } from "@/components/lifeecho/status-badge";
import { archiveEntryQuery, ensureCompleteProfile, archiveListQuery, legacyMemoriesQuery, useMediaUrls } from "@/lib/archive";
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
  const { data: list } = useSuspenseQuery(archiveListQuery());
  const { data: memories } = useSuspenseQuery(legacyMemoriesQuery(entry!.person_id));
  const e = entry!;
  const { data: urls } = useMediaUrls([e.avatar_path, ...memories.map((m) => m.media_path)]);
  const idx = list.findIndex((x) => x.profile_number === e.profile_number);
  const prev = idx > 0 ? list[idx - 1] : undefined;
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : undefined;

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <Link to="/archive" className="text-sm text-muted-foreground hover:text-foreground">
        ← Memory Archive
      </Link>
      <section className="mt-6 flex flex-col gap-6 md:flex-row md:items-center">
        <div className="size-32 shrink-0 overflow-hidden rounded-full bg-muted">
          {e.avatar_path && urls?.[e.avatar_path] && (
            <img src={urls[e.avatar_path]} alt={e.full_name} className="size-full object-cover" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wider text-primary uppercase">
            {formatProfileNumber(e.profile_number)}
            {e.is_demo && <span className="ml-2 text-muted-foreground normal-case">· Demo profile</span>}
          </p>
          <h1 className="mt-2 text-5xl font-semibold">{e.full_name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-muted-foreground">
            <StatusBadge status="deceased" />
            <span>{[lifespan(e.date_of_birth, e.date_of_death), countryName(e.country)].filter(Boolean).join(" · ")}</span>
          </div>
        </div>
      </section>
      {e.biography && <p className="mt-8 max-w-3xl text-lg leading-relaxed whitespace-pre-line">{e.biography}</p>}

      <h2 className="mt-14 text-3xl font-semibold">Their legacy</h2>
      {memories.length === 0 ? (
        <p className="mt-4 text-muted-foreground">No memories were shared in this legacy.</p>
      ) : (
        <div className="mt-6 columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3">
          {memories.map((m) => (
            <MemoryCard key={m.id} memory={m} url={m.media_path ? urls?.[m.media_path] : undefined} />
          ))}
        </div>
      )}

      <nav className="mt-16 flex justify-between gap-3 border-t border-border pt-6">
        {prev ? (
          <Button asChild variant="glass">
            <Link to="/archive/$number" params={{ number: profileSlug(prev.profile_number) }}>
              <ArrowLeft /> Visit Previous Profile
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {next && (
          <Button asChild variant="glass">
            <Link to="/archive/$number" params={{ number: profileSlug(next.profile_number) }}>
              Next Profile <ArrowRight />
            </Link>
          </Button>
        )}
      </nav>
    </div>
  );
}
