import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { memorialsQuery, useMediaUrls } from "@/lib/archive";
import { MemorialTile } from "@/components/lifeecho/memorial-tile";
import { LogoMark } from "@/components/lifeecho/logo";

export const Route = createFileRoute("/_authenticated/archive/")({
  head: () => ({
    meta: [
      { title: "Memory Archive — LifeEcho" },
      { name: "description", content: "Every memorial you are preserving, in one secure archive." },
      { property: "og:title", content: "Memory Archive — LifeEcho" },
      { property: "og:description", content: "Every memorial you are preserving, in one secure archive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(memorialsQuery()),
  component: ArchivePage,
});

function ArchivePage() {
  const { data: memorials } = useSuspenseQuery(memorialsQuery());
  const [q, setQ] = useState("");
  const { data: urls } = useMediaUrls(memorials.map((m) => m.cover_path));
  const shown = memorials.filter((m) => m.full_name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Memory Archive</p>
          <h1 className="mt-3 text-4xl font-semibold md:text-5xl">The people we carry with us.</h1>
          <p className="mt-3 max-w-lg text-muted-foreground">
            Each memorial is private until you choose to share it.
          </p>
        </div>
        <Button asChild variant="hero" size="xl">
          <Link to="/archive/new"><Plus /> New memorial</Link>
        </Button>
      </div>

      {memorials.length > 0 && (
        <div className="relative mt-10 max-w-sm">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="h-11 rounded-full pl-10" aria-label="Search memorials" />
        </div>
      )}

      {memorials.length === 0 ? (
        <div className="glass-panel mt-10 flex flex-col items-center rounded-3xl px-6 py-20 text-center">
          <LogoMark className="size-14" />
          <h2 className="mt-6 text-3xl font-semibold">Your archive is waiting</h2>
          <p className="mt-2 max-w-sm text-muted-foreground">Create the first memorial and begin gathering stories, photos, videos and voices.</p>
          <Button asChild variant="hero" size="lg" className="mt-8 rounded-full">
            <Link to="/archive/new"><Plus /> Create a memorial</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((m) => (
            <MemorialTile key={m.id} m={m} coverUrl={m.cover_path ? urls?.[m.cover_path] : undefined} />
          ))}
          {shown.length === 0 && <p className="text-muted-foreground">No memorials match "{q}".</p>}
        </div>
      )}
    </div>
  );
}
