import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { requireUserId, uploadMedia } from "@/lib/archive";
import { acceptFor, KIND_LABEL, MEMORY_KINDS, validateMemoryFile, type MemoryKind } from "@/lib/memory-rules";
import { KIND_ICON } from "./memory-card";

export function AddMemoryDialog({ memorialId }: { memorialId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<MemoryKind>("story");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setKind("story");
    setTitle("");
    setBody("");
    setDate("");
    setFile(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const err = validateMemoryFile(kind, file);
    if (err) { toast.error(err); return; }
    setBusy(true);
    try {
      const uid = await requireUserId();
      const media_path = kind !== "story" && file ? await uploadMedia(file, memorialId) : null;
      const { error } = await supabase.from("memories").insert({
        memorial_id: memorialId,
        owner_id: uid,
        kind,
        title: title.trim(),
        body: body.trim() || null,
        memory_date: date || null,
        media_path,
      });
      if (error) throw error;
      toast.success("Memory preserved.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["memorial", memorialId] }),
        qc.invalidateQueries({ queryKey: ["memorials"] }),
        qc.invalidateQueries({ queryKey: ["archive-stats"] }),
      ]);
      reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save this memory");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="hero" size="lg" className="rounded-full">
          <Plus /> Add memory
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl">Add a memory</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Type of memory">
            {MEMORY_KINDS.map((k) => {
              const Icon = KIND_ICON[k];
              const active = k === kind;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => { setKind(k); setFile(null); }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition-colors ${
                    active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-5" />
                  {KIND_LABEL[k]}
                </button>
              );
            })}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="m-title">Title</Label>
            <Input id="m-title" required value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" placeholder={kind === "story" ? "The summer at the lake" : "Grandma's 80th birthday"} />
          </div>
          {kind !== "story" && (
            <div className="grid gap-2">
              <Label htmlFor="m-file">{KIND_LABEL[kind]} file</Label>
              <label htmlFor="m-file" className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-input px-4 py-5 text-sm text-muted-foreground hover:border-primary/50">
                <Upload className="size-5 text-primary" />
                <span className="truncate">{file ? file.name : `Choose a ${KIND_LABEL[kind].toLowerCase()} (up to 50 MB)`}</span>
              </label>
              <input id="m-file" type="file" accept={acceptFor(kind)} className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="m-body">{kind === "story" ? "The story" : "Caption (optional)"}</Label>
            <Textarea id="m-body" rows={kind === "story" ? 7 : 3} required={kind === "story"} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="m-date">When did it happen? (optional)</Label>
            <Input id="m-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
          </div>
          <Button type="submit" variant="hero" size="lg" className="mt-2 h-11 rounded-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Preserve memory
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
