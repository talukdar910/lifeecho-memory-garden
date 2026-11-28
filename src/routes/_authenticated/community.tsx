import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AddMemoryDialog } from "@/components/lifeecho/add-memory-dialog";
import { ArchiveSpotlight } from "@/components/lifeecho/archive-spotlight";
import { ensureCompleteProfile } from "@/lib/archive";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({
    meta: [
      { title: "Community — LifeEcho" },
      { name: "description", content: "Your LifeEcho space for preserving memories and visiting the Memory Archive." },
      { property: "og:title", content: "Community — LifeEcho" },
      { property: "og:description", content: "Preserve your stories and explore the LifeEcho Memory Archive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    await ensureCompleteProfile(context.queryClient);
  },
  component: CommunityPage,
});

function CommunityPage() {
  return (
    <>
      <ArchiveSpotlight />
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="eyebrow">The living community</p>
            <h1 className="mt-2 text-4xl font-semibold md:text-5xl">Shared lives</h1>
          </div>
          <div className="flex flex-col items-center gap-2">
            <AddMemoryDialog />
            <Button asChild variant="ghost" className="font-sans text-sm font-normal text-muted-foreground">
              <Link to="/dashboard">My memories</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
