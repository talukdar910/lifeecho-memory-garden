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

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w.charAt(0)).join("");
}

function ArchivePage() {
  const { data: entries } = useSuspenseQuery(archiveListQuery());
  const { data: urls } = useMediaUrls(entries.map((e) => e.avatar_path));

  return (
    <div className="memorial min-h-screen">
      <div className="mx-auto max-w-6xl px-5 py-14 text-center md:py-20">
        <p className="text-xs tracking-[0.4em] text-memorial-gold uppercase">In loving memory</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl leading-tight font-medium md:text-6xl">The LifeEcho Memory Archive</h1>
        <div className="memorial-rule mx-auto mt-6 w-40" />
        <p className="mx-auto mt-6 max-w-xl text-lg text-memorial-muted italic">
          Lives remembered, legacies kept. Each name here belongs to someone whose passing has been verified.
        </p>
        {entries.length === 0 ? (
          <p className="mt-12 text-memorial-muted">No archived profiles yet.</p>
        ) : (
          <div className="mt-12 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((e) => (
              <Link
                key={e.id}
                to="/archive/$number"
                params={{ number: profileSlug(e.profile_number) }}
                className="memorial-card group flex items-center gap-4 rounded-sm p-5 transition-colors hover:border-memorial-gold/60"
              >
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-memorial-line bg-memorial text-xl text-memorial-gold grayscale">
                  {e.avatar_path && urls?.[e.avatar_path] ? (
                    <img src={urls[e.avatar_path]} alt={e.full_name} className="size-full object-cover" />
                  ) : (
                    initials(e.full_name)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs tracking-[0.2em] text-memorial-gold uppercase">{formatProfileNumber(e.profile_number)}</p>
                  <h2 className="truncate text-2xl font-medium">{e.full_name}</h2>
                  <p className="truncate text-sm text-memorial-muted italic">
                    {[lifespan(e.date_of_birth, e.date_of_death), countryName(e.country)].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
