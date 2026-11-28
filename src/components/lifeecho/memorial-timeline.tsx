import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Globe2, Lock, Sprout } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { archiveMemoriesQuery, legacyMemoriesQuery, removeMedia, useMediaUrls, type ArchiveEntry } from "@/lib/archive";
import { canManageContribution, sortMemoryTimeline } from "@/lib/memory-rules";
import { AddMemoryDialog } from "./add-memory-dialog";
import { MemoryCard } from "./memory-card";

export function MemorialTimeline({ entry }: { entry: ArchiveEntry }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: originals } = useSuspenseQuery(legacyMemoriesQuery(entry.person_id));
  const { data: contributions } = useSuspenseQuery(archiveMemoriesQuery(entry.id));
  const memories = sortMemoryTimeline([
    ...originals.map((memory) => ({ ...memory, contribution: false })),
    ...contributions.map((memory) => ({ ...memory, contribution: true })),
  ]);
  const { data: urls } = useMediaUrls(memories.map((m) => m.media_path));
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function changeVisibility(id: string, privacy: "private" | "public") {
    const { error } = await supabase.from("archive_memories").update({ privacy }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["archive-contributions", entry.id] });
  }

  async function deleteContribution() {
    const memory = contributions.find((m) => m.id === deleting);
    if (!memory || !canManageContribution(memory.owner_id, user?.id)) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("archive_memories").delete().eq("id", memory.id);
      if (error) throw error;
      await removeMedia([memory.media_path]);
      await qc.invalidateQueries({ queryKey: ["archive-contributions", entry.id] });
      setDeleting(null);
      toast.success("Memory deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete this memory.");
    } finally { setBusy(false); }
  }

  return (
    <section className="mt-14" aria-label="Memorial timeline">
      <div className="flex flex-col items-center gap-5 border-b border-memorial-line pb-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <Sprout aria-hidden className="mb-3 size-5 text-memorial-gold" strokeWidth={1} />
          <h2 className="text-4xl font-medium">A life, in memories</h2>
          <p className="mt-2 text-lg text-memorial-muted">{memories.length} {memories.length === 1 ? "memory" : "memories"} preserved</p>
        </div>
        <AddMemoryDialog archiveEntryId={entry.id} memorialName={entry.full_name} />
      </div>
      {memories.length === 0 ? (
        <div className="py-14 text-center">
          <h3 className="text-2xl">A memory worth keeping</h3>
          <p className="mt-3 text-lg text-memorial-muted">No memories are shared with you yet.</p>
        </div>
      ) : (
        <ol className="mt-10 space-y-10 border-l border-memorial-line pl-5 sm:pl-8">
          {memories.map((m, index) => {
            const year = m.memory_date?.slice(0, 4) ?? "Undated";
            const previous = memories[index - 1];
            const previousYear = previous ? previous.memory_date?.slice(0, 4) ?? "Undated" : null;
            const own = m.contribution && canManageContribution(m.owner_id, user?.id);
            return (
              <li key={m.id} className="relative">
                <span aria-hidden className="absolute top-2 -left-[1.55rem] size-3 rounded-full border border-memorial-gold bg-memorial sm:-left-[2.3rem]" />
                {year !== previousYear && <h3 className="mb-4 text-3xl text-memorial-gold">{year}</h3>}
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-memorial-muted">
                  {m.memory_date && <time dateTime={m.memory_date}>{format(new Date(`${m.memory_date}T12:00:00`), "d MMMM yyyy")}</time>}
                  <span>{m.contribution ? own ? "Your remembrance" : "Shared remembrance" : `From ${entry.full_name}'s memories`}</span>
                </div>
                <MemoryCard memory={m} url={m.media_path ? urls?.[m.media_path] : undefined} showPrivacy={!m.contribution} reportable={!m.contribution} translatable={!m.contribution} onDelete={own ? () => setDeleting(m.id) : undefined} />
                {own && <div className="mt-3 flex gap-2" role="group" aria-label={`Visibility of ${m.title}`}>
                  <Button variant={m.privacy === "private" ? "secondary" : "ghost"} size="sm" disabled={busy} aria-pressed={m.privacy === "private"} onClick={() => changeVisibility(m.id, "private")}><Lock /> Only me</Button>
                  <Button variant={m.privacy === "public" ? "secondary" : "ghost"} size="sm" disabled={busy} aria-pressed={m.privacy === "public"} onClick={() => changeVisibility(m.id, "public")}><Globe2 /> Public</Button>
                </div>}
              </li>
            );
          })}
        </ol>
      )}
      <Dialog open={deleting !== null} onOpenChange={(open) => { if (!open && !busy) setDeleting(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete this remembrance?</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">This permanently removes your memory and its attached file.</p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" disabled={busy} onClick={() => setDeleting(null)}>Keep memory</Button>
            <Button variant="destructive" disabled={busy} onClick={deleteContribution}>{busy ? "Deleting…" : "Delete remembrance"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}