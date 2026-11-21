import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { format } from "date-fns";
import { Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemoryCard } from "@/components/lifeecho/memory-card";
import { StatusBadge } from "@/components/lifeecho/status-badge";
import { useAuth } from "@/lib/auth-context";
import { useMediaUrls } from "@/lib/archive";
import { countryName } from "@/lib/locales";
import { getPublicEcho } from "@/lib/public-echo.functions";

export const Route = createFileRoute("/echo/$memberId")({
  loader: async ({ params }) => {
    const res = await getPublicEcho({ data: { memberId: params.memberId } }).catch(() => null);
    if (!res?.member) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    const name = loaderData?.member?.full_name;
    const title = name ? `${name}'s public memories — LifeEcho` : "Public memories — LifeEcho";
    const description = name
      ? `Stories, photos and moments ${name} chose to share openly on LifeEcho.`
      : "Memories shared openly on LifeEcho.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="text-4xl font-semibold">Nothing shared here</h1>
      <p className="mt-3 text-muted-foreground">This member hasn't shared any public memories, or the link is wrong.</p>
      <Button asChild variant="glass" className="mt-6">
        <Link to="/">Discover LifeEcho</Link>
      </Button>
    </div>
  ),
  component: PublicEcho,
});

function PublicEcho() {
  const { member, memories } = Route.useLoaderData();
  const m = member!;
  const { user } = useAuth();
  const { data: urls } = useMediaUrls([m.avatar_path, ...memories.map((x) => x.media_path)]);
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <section className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="size-28 shrink-0 overflow-hidden rounded-full bg-aurora">
          {m.avatar_path && urls?.[m.avatar_path] && (
            <img src={urls[m.avatar_path]} alt={m.full_name ?? ""} className="size-full object-cover" />
          )}
        </div>
        <div>
          <p className="eyebrow inline-flex items-center gap-1.5">
            <Globe2 className="size-3.5" /> Public memories
          </p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">{m.full_name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <StatusBadge status={m.status} />
            <span>
              {[countryName(m.country), `Member since ${format(new Date(m.member_since), "MMMM yyyy")}`]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        </div>
      </section>
      {m.bio && <p className="mt-8 max-w-3xl text-lg leading-relaxed whitespace-pre-line">{m.bio}</p>}
      <div className="mt-12 columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3">
        {memories.map((x) => (
          <MemoryCard key={x.id} memory={x} url={x.media_path ? urls?.[x.media_path] : undefined} />
        ))}
      </div>
      {!user && (
        <div className="glass-panel mt-16 rounded-3xl px-6 py-10 text-center">
          <h2 className="text-3xl font-semibold">Your Life. Your Emotions. Your Legacy.</h2>
          <p className="mt-2 text-muted-foreground">Keep your own memories safe — privately, for your legacy, or for the world.</p>
          <Button asChild variant="hero" size="lg" className="mt-6 rounded-full">
            <Link to="/auth" search={{ mode: "signup" }}>Create your LifeEcho</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
