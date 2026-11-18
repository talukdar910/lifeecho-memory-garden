import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { format } from "date-fns";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicMemorial } from "@/lib/public-memorial.functions";
import { lifespan } from "@/lib/memory-rules";
import { useMediaUrls } from "@/lib/archive";
import { MemoryCard } from "@/components/lifeecho/memory-card";
import { LogoMark } from "@/components/lifeecho/logo";
import { Particles } from "@/components/lifeecho/particles";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/memorial/$memorialId")({
  loader: async ({ params }) => {
    if (!UUID.test(params.memorialId)) throw notFound();
    const data = await getPublicMemorial({ data: { id: params.memorialId } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const m = loaderData?.memorial;
    const title = m ? `In memory of ${m.full_name} — LifeEcho` : "Memorial unavailable — LifeEcho";
    const desc = m
      ? m.epitaph || `Stories, photos and memories of ${m.full_name}, preserved on LifeEcho.`
      : "This memorial is private or no longer available.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
        ...(m ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <LogoMark className="mx-auto size-14" />
      <h1 className="mt-6 text-4xl font-semibold">This memorial is private</h1>
      <p className="mt-2 text-muted-foreground">It may have been made private by its keeper, or the link is incorrect.</p>
      <Button asChild variant="hero" className="mt-8 rounded-full"><Link to="/">Discover LifeEcho</Link></Button>
    </div>
  ),
  component: PublicMemorial,
});

function PublicMemorial() {
  const { memorial: m, memories } = Route.useLoaderData();
  const { data: urls } = useMediaUrls([m.cover_path, ...memories.map((x) => x.media_path)]);
  const cover = m.cover_path ? urls?.[m.cover_path] : undefined;

  return (
    <div>
      <section className="relative overflow-hidden">
        <Particles />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-5 py-16 text-center">
          <div className="size-44 overflow-hidden rounded-full border-2 border-primary/40 shadow-glow md:size-56">
            {cover ? <img src={cover} alt={m.full_name} className="h-full w-full object-cover" /> : (
              <div className="flex h-full items-center justify-center bg-secondary"><LogoMark className="size-16" /></div>
            )}
          </div>
          <p className="eyebrow mt-8">In loving memory</p>
          <h1 className="mt-3 text-5xl leading-none font-semibold md:text-7xl">{m.full_name}</h1>
          <p className="mt-4 font-display text-2xl text-aurora">{lifespan(m.birth_date, m.death_date)}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-x-5 text-sm text-muted-foreground">
            {m.birth_date && <span>Born {format(new Date(m.birth_date), "d MMMM yyyy")}</span>}
            {m.death_date && <span>Passed {format(new Date(m.death_date), "d MMMM yyyy")}</span>}
            {m.birthplace && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{m.birthplace}</span>}
          </div>
          {m.epitaph && <p className="mt-6 font-display text-2xl italic">"{m.epitaph}"</p>}
        </div>
      </section>

      {m.biography && (
        <section className="mx-auto max-w-3xl px-5 pb-10">
          <h2 className="text-3xl font-semibold">Life story</h2>
          <p className="mt-4 leading-relaxed whitespace-pre-line text-muted-foreground">{m.biography}</p>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="text-3xl font-semibold">Memories</h2>
        {memories.length === 0 ? (
          <p className="mt-4 text-muted-foreground">Memories will appear here as they are shared.</p>
        ) : (
          <div className="mt-6 columns-1 gap-5 space-y-5 sm:columns-2 lg:columns-3">
            {memories.map((x) => (
              <MemoryCard key={x.id} memory={x} url={x.media_path ? urls?.[x.media_path] : undefined} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
