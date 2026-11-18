import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Copy, ExternalLink, Globe2, Lock, MapPin, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { memorialDetailQuery, removeMedia, uploadMedia, useMediaUrls } from "@/lib/archive";
import { KIND_PLURAL, lifespan, MEMORY_KINDS, type Visibility } from "@/lib/memory-rules";
import { MemoryCard } from "@/components/lifeecho/memory-card";
import { AddMemoryDialog } from "@/components/lifeecho/add-memory-dialog";
import { MemorialForm } from "@/components/lifeecho/memorial-form";
import { LogoMark } from "@/components/lifeecho/logo";

export const Route = createFileRoute("/_authenticated/archive/$memorialId")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(memorialDetailQuery(params.memorialId));
    if (!data.memorial) throw notFound();
    return { name: data.memorial.full_name };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.name} — Memory Archive · LifeEcho` : "Memorial — LifeEcho" },
      { name: "description", content: "A memorial preserved in the LifeEcho Memory Archive." },
      { property: "og:title", content: loaderData ? `${loaderData.name} — LifeEcho` : "Memorial — LifeEcho" },
      { property: "og:description", content: "A memorial preserved in the LifeEcho Memory Archive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <h1 className="text-4xl font-semibold">Memorial not found</h1>
      <Button asChild variant="glass" className="mt-6"><Link to="/archive">Back to archive</Link></Button>
    </div>
  ),
  component: MemorialPage,
});

function MemorialPage() {
  const { memorialId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(memorialDetailQuery(memorialId));
  const memorial = data.memorial!;
  const memories = data.memories;
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState(false);
  const { data: urls } = useMediaUrls([memorial.cover_path, ...memories.map((m) => m.media_path)]);
  const shown = filter === "all" ? memories : memories.filter((m) => m.kind === filter);
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/memorial/${memorial.id}` : "";

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["memorial", memorialId] }),
      qc.invalidateQueries({ queryKey: ["memorials"] }),
      qc.invalidateQueries({ queryKey: ["archive-stats"] }),
    ]);

  async function setVisibility(v: Visibility) {
    const { error } = await supabase.from("memorials").update({ visibility: v }).eq("id", memorial.id);
    if (error) { toast.error(error.message); return; }
    toast.success(v === "public" ? "Memorial is now public." : "Memorial is now private.");
    refresh();
  }

  async function deleteMemory(id: string, path: string | null) {
    const { error } = await supabase.from("memories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await removeMedia([path]);
    toast.success("Memory removed.");
    refresh();
  }

  async function deleteMemorial() {
    const { error } = await supabase.from("memorials").delete().eq("id", memorial.id);
    if (error) { toast.error(error.message); return; }
    await removeMedia([memorial.cover_path, ...memories.map((m) => m.media_path)]);
    await qc.invalidateQueries({ queryKey: ["memorials"] });
    qc.invalidateQueries({ queryKey: ["archive-stats"] });
    toast.success("Memorial deleted.");
    navigate({ to: "/archive" });
  }

  const cover = memorial.cover_path ? urls?.[memorial.cover_path] : undefined;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <Link to="/archive" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Memory Archive
      </Link>

      <section className="mt-6 grid gap-8 md:grid-cols-[320px_1fr] md:items-end">
        <div className="glass-panel aspect-[4/5] overflow-hidden rounded-3xl">
          {cover ? (
            <img src={cover} alt={memorial.full_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center"><LogoMark className="size-20 opacity-60" /></div>
          )}
        </div>
        <div>
          <p className="eyebrow">In loving memory</p>
          <h1 className="mt-3 text-5xl leading-none font-semibold md:text-6xl">{memorial.full_name}</h1>
          <p className="mt-3 font-display text-2xl text-aurora">{lifespan(memorial.birth_date, memorial.death_date)}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {memorial.birth_date && <span>Born {format(new Date(memorial.birth_date), "d MMMM yyyy")}</span>}
            {memorial.death_date && <span>Passed {format(new Date(memorial.death_date), "d MMMM yyyy")}</span>}
            {memorial.birthplace && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{memorial.birthplace}</span>}
          </div>
          {memorial.epitaph && <p className="mt-5 font-display text-2xl text-foreground/90 italic">"{memorial.epitaph}"</p>}

          <div className="glass-panel mt-6 flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Switch
                checked={memorial.visibility === "public"}
                onCheckedChange={(c) => setVisibility(c ? "public" : "private")}
                aria-label="Share publicly"
              />
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  {memorial.visibility === "public" ? <><Globe2 className="size-4 text-primary" /> Public</> : <><Lock className="size-4" /> Private</>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {memorial.visibility === "public" ? "Anyone with the link can visit." : "Only you can see this memorial."}
                </p>
              </div>
            </div>
            {memorial.visibility === "public" && (
              <div className="flex gap-2">
                <Button variant="glass" size="sm" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copied."); }}>
                  <Copy /> Copy link
                </Button>
                <Button asChild variant="glass" size="sm">
                  <Link to="/memorial/$memorialId" params={{ memorialId: memorial.id }} target="_blank"><ExternalLink /> View</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {memorial.biography && (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-3xl font-semibold">Life story</h2>
          <p className="mt-4 leading-relaxed whitespace-pre-line text-muted-foreground">{memorial.biography}</p>
        </section>
      )}

      <section className="mt-14">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-3xl font-semibold">Memories <span className="text-muted-foreground">({memories.length})</span></h2>
          <AddMemoryDialog memorialId={memorial.id} />
        </div>
        <Tabs value={filter} onValueChange={setFilter} className="mt-6 -mx-5 overflow-x-auto px-5">
          <TabsList className="h-auto bg-secondary">
            <TabsTrigger value="all">All</TabsTrigger>
            {MEMORY_KINDS.map((k) => <TabsTrigger key={k} value={k}>{KIND_PLURAL[k]}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        {shown.length === 0 ? (
          <p className="mt-8 text-muted-foreground">
            {memories.length === 0 ? "No memories yet. Add the first story, photo, video or recording." : "Nothing here yet."}
          </p>
        ) : (
          <div className="mt-6 columns-1 gap-5 space-y-5 sm:columns-2 lg:columns-3">
            {shown.map((m) => (
              <MemoryCard
                key={m.id}
                memory={m}
                url={m.media_path ? urls?.[m.media_path] : undefined}
                onDelete={() => deleteMemory(m.id, m.media_path)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-16 flex flex-wrap gap-3 border-t border-border pt-8">
        <Button variant="glass" onClick={() => setEditing(true)}><Pencil /> Edit details</Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="text-destructive hover:text-destructive"><Trash2 /> Delete memorial</Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this memorial?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes {memorial.full_name}'s memorial and all {memories.length} memories, including uploaded files.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction onClick={deleteMemorial} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete forever</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-card sm:max-w-xl">
          <DialogHeader><DialogTitle className="font-display text-3xl">Edit memorial</DialogTitle></DialogHeader>
          <MemorialForm
            initial={{ ...memorial, visibility: memorial.visibility as Visibility }}
            submitLabel="Save changes"
            onSubmit={async (v, newCover) => {
              const clean = (s?: string | null) => (s && s.trim() ? s.trim() : null);
              let cover_path = memorial.cover_path;
              if (newCover) {
                cover_path = await uploadMedia(newCover, memorial.id);
                await removeMedia([memorial.cover_path]);
              }
              const { error } = await supabase.from("memorials").update({
                full_name: v.full_name.trim(),
                birth_date: clean(v.birth_date),
                death_date: clean(v.death_date),
                birthplace: clean(v.birthplace),
                epitaph: clean(v.epitaph),
                biography: clean(v.biography),
                visibility: v.visibility,
                cover_path,
              }).eq("id", memorial.id);
              if (error) throw error;
              await refresh();
              toast.success("Memorial updated.");
              setEditing(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
