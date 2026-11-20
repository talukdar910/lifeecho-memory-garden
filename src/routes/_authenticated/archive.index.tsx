import { createFileRoute, Link } from "@tanstack/react-router";
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

function ArchivePage() {
  const { data: entries } = useSuspenseQuery(archiveListQuery());
  const { data: urls } = useMediaUrls(entries.map((e) => e.avatar_path));

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <p className="eyebrow">LifeEcho Memory Archive</p>
      <h1 className="mt-3 max-w-2xl text-5xl font-semibold">Lives remembered, legacies kept.</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Each profile is added only after a passing has been verified, and shows the memories its owner chose to leave
        as their legacy.
      </p>
      {entries.length === 0 ? (
        <p className="mt-12 text-muted-foreground">No archived profiles yet.</p>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((e) => (
            <Link
              key={e.id}
              to="/archive/$number"
              params={{ number: profileSlug(e.profile_number) }}
              className="glass-panel group flex items-center gap-4 rounded-2xl p-5 transition-all hover:-translate-y-1 hover:border-primary/40"
            >
              <div className="size-16 shrink-0 overflow-hidden rounded-full bg-muted grayscale">
                {e.avatar_path && urls?.[e.avatar_path] && (
                  <img src={urls[e.avatar_path]} alt={e.full_name} className="size-full object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-wider text-primary uppercase">
                  {formatProfileNumber(e.profile_number)}
                  {e.is_demo && <span className="ml-2 text-muted-foreground normal-case">· Demo</span>}
                </p>
                <h2 className="truncate text-2xl font-semibold">{e.full_name}</h2>
                <p className="text-sm text-muted-foreground">
                  {[lifespan(e.date_of_birth, e.date_of_death), countryName(e.country)].filter(Boolean).join(" · ")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
