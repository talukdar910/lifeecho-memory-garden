import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { AlertCircle, ArrowRight, Copy, ExternalLink, Globe2, Hourglass } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AddMemoryDialog } from "@/components/lifeecho/add-memory-dialog";
import { MemoryCard } from "@/components/lifeecho/memory-card";
import { StatusBadge } from "@/components/lifeecho/status-badge";
import { ArchiveSpotlight } from "@/components/lifeecho/archive-spotlight";
import { supabase } from "@/integrations/supabase/client";
import { ensureCompleteProfile, legacyContactsQuery, myMemoriesQuery, profileQuery, removeMedia, useMediaUrls } from "@/lib/archive";
import {
  KIND_PLURAL,
  MEMORY_KINDS,
  missingProfileFields,
  PRIVACY_LABEL,
  PRIVACY_OPTIONS,
  type MemoryKind,
  type Privacy,
} from "@/lib/memory-rules";

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
  loader: async ({ context }) => {
    await ensureCompleteProfile(context.queryClient);
    await Promise.all([
      context.queryClient.ensureQueryData(myMemoriesQuery()),
      context.queryClient.ensureQueryData(legacyContactsQuery()),
    ]);
  },
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const { data: me } = useSuspenseQuery(profileQuery());
  const { data: memories } = useSuspenseQuery(myMemoriesQuery());
  const { data: contacts } = useSuspenseQuery(legacyContactsQuery());
  const [filter, setFilter] = useState<MemoryKind | "all">("all");
  const profile = me.profile;
  const missing = missingProfileFields(profile);
  const { data: urls } = useMediaUrls([profile?.avatar_url, ...memories.map((m) => m.media_path)]);
  const shown = filter === "all" ? memories : memories.filter((m) => m.kind === filter);
  const name = profile?.full_name || profile?.display_name || me.email;
  const counts = Object.fromEntries(
    PRIVACY_OPTIONS.map((p) => [p, memories.filter((m) => m.privacy === p).length]),
  ) as Record<Privacy, number>;

  async function changePrivacy(id: string, privacy: Privacy) {
    const { error } = await supabase.from("life_memories").update({ privacy }).eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success(`Now visible to: ${PRIVACY_LABEL[privacy]}.`);
    await qc.invalidateQueries({ queryKey: ["my-memories"] });
  }

  async function copyPublicLink() {
    const url = `${window.location.origin}/echo/${me.userId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link to your public page copied.");
    } catch {
      toast.message(url);
    }
  }

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
    <>
    <ArchiveSpotlight />
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

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="glass-panel flex flex-col gap-3 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Globe2 className="size-4 text-primary" /> Your public page
          </div>
          {counts.public > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                {counts.public} public {counts.public === 1 ? "memory is" : "memories are"} open for anyone to see.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="glass" size="sm" onClick={copyPublicLink}>
                  <Copy /> Copy link
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/echo/$memberId" params={{ memberId: me.userId }}>
                    <ExternalLink /> View
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Mark a memory as Public to get a page you can share with anyone.</p>
          )}
        </div>
        <div className="glass-panel flex flex-col gap-3 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Hourglass className="size-4 text-primary" /> Your legacy
          </div>
          <p className="text-sm text-muted-foreground">
            {counts.legacy} legacy {counts.legacy === 1 ? "memory" : "memories"} ·{" "}
            {contacts.length} legacy {contacts.length === 1 ? "contact" : "contacts"}
            {counts.legacy > 0 && contacts.length === 0 && " — no one will be able to see them yet."}
          </p>
          <Button asChild variant="glass" size="sm" className="self-start">
            <Link to="/profile" hash="legacy-contacts">
              Manage legacy contacts <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your memories</p>
          <h2 className="mt-2 text-3xl font-semibold">
            {memories.length} {memories.length === 1 ? "memory" : "memories"} preserved
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {PRIVACY_OPTIONS.map((p) => `${counts[p]} ${PRIVACY_LABEL[p].toLowerCase()}`).join(" · ")}
          </p>
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
              onPrivacyChange={(p) => changePrivacy(m.id, p)}
              showPrivacy
            />
          ))}
        </div>
      )}
    </div>
    </>
  );
}
