import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AddMemoryDialog } from "@/components/lifeecho/add-memory-dialog";
import { MemoryCard } from "@/components/lifeecho/memory-card";
import { StatusBadge } from "@/components/lifeecho/status-badge";
import { supabase } from "@/integrations/supabase/client";
import { myMemoriesQuery, profileQuery, removeMedia, useMediaUrls } from "@/lib/archive";
import { KIND_PLURAL, MEMORY_KINDS, missingProfileFields, type MemoryKind } from "@/lib/memory-rules";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My memories — LifeEcho" },
      { name: "description", content: "Your private LifeEcho space for stories, thoughts, photos, videos and voice." },
      { property: "og:title", content: "My memories — LifeEcho" },
      { property: "og:description", content: "Your Life. Your Emotions. Your Legacy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(profileQuery()),
      context.queryClient.ensureQueryData(myMemoriesQuery()),
    ]),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const { data: me } = useSuspenseQuery(profileQuery());
  const { data: memories } = useSuspenseQuery(myMemoriesQuery());
  const [filter, setFilter] = useState<MemoryKind | "all">("all");
  const profile = me.profile;
  const missing = missingProfileFields(profile);
  const { data: urls } = useMediaUrls([profile?.avatar_url, ...memories.map((m) => m.media_path)]);
  const shown = filter === "all" ? memories : memories.filter((m) => m.kind === filter);
  const name = profile?.full_name || profile?.display_name || me.email;

  async function remove(id: string, path: string | null) {
    if (!confirm("Delete this memory forever?")) return;
    const { error } = await supabase.from("life_memories").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await removeMedia([path]);
    toast.success("Memory deleted.");
    await qc.invalidateQueries({ queryKey: ["my-memories"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <section className="glass-panel flex flex-col gap-6 rounded-3xl p-6 md:flex-row md:items-center md:p-8">
        <div className="size-20 shrink-0 overflow-hidden rounded-full bg-aurora">
          {profile?.avatar_url && urls?.[profile.avatar_url] && (
            <img src={urls[profile.avatar_url]} alt={name} className="size-full object-cover" />
          )}
        </div>
        <div className="flex-1">
          <StatusBadge status={profile?.status} />
          <h1 className="mt-3 text-4xl font-semibold">{name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Member since {format(new Date(profile?.created_at ?? me.createdAt), "MMMM yyyy")}
            {profile?.last_active_at &&
              ` · Last active ${formatDistanceToNow(new Date(profile.last_active_at), { addSuffix: true })}`}
          </p>
        </div>
        <AddMemoryDialog />
      </section>

      {missing.length > 0 && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center">
          <AlertCircle className="size-5 shrink-0 text-primary" />
          <p className="flex-1 text-sm">Finish your profile — still missing: {missing.join(", ")}.</p>
          <Button asChild variant="glass" size="sm">
            <Link to="/profile">
              Complete profile <ArrowRight />
            </Link>
          </Button>
        </div>
      )}

      <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your memories</p>
          <h2 className="mt-2 text-3xl font-semibold">
            {memories.length} {memories.length === 1 ? "memory" : "memories"} preserved
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", ...MEMORY_KINDS] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              aria-pressed={filter === k}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {k === "all" ? "All" : KIND_PLURAL[k]}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-border px-6 py-16 text-center">
          <p className="font-display text-3xl">Nothing here yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add a story, a thought or a voice note — it stays private until you choose otherwise.
          </p>
        </div>
      ) : (
        <div className="mt-8 columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3">
          {shown.map((m) => (
            <MemoryCard
              key={m.id}
              memory={m}
              url={m.media_path ? urls?.[m.media_path] : undefined}
              onDelete={() => remove(m.id, m.media_path)}
              showPrivacy
            />
          ))}
        </div>
      )}
    </div>
  );
}
