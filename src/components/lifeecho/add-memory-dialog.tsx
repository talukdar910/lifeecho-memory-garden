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
import { requireUserId, uploadFile } from "@/lib/archive";
import {
  acceptFor,
  DEFAULT_PRIVACY,
  EMOTIONS,
  EMOTION_LABEL,
  isTextKind,
  KIND_LABEL,
  MEMORY_KINDS,
  validateMemoryFile,
  type Emotion,
  type MemoryKind,
  type Privacy,
} from "@/lib/memory-rules";
import { KIND_ICON } from "./memory-card";
import { PrivacyPicker } from "./privacy";

export function AddMemoryDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<MemoryKind>("story");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [privacy, setPrivacy] = useState<Privacy>(DEFAULT_PRIVACY);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const textOnly = isTextKind(kind);

  function reset() {
    setKind("story");
    setTitle("");
    setBody("");
    setDate("");
    setEmotion(null);
    setPrivacy(DEFAULT_PRIVACY);
    setFile(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const err = validateMemoryFile(kind, file);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      const uid = await requireUserId();
      const media_path = !textOnly && file ? await uploadFile(file, "memories") : null;
      const { error } = await supabase.from("life_memories").insert({
        owner_id: uid,
        kind,
        title: title.trim(),
        body: body.trim() || null,
        memory_date: date || null,
        emotion,
        privacy,
        media_path,
      });
      if (error) throw error;
      toast.success("Memory preserved.");
      await qc.invalidateQueries({ queryKey: ["my-memories"] });
      reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save this memory");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
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
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Type of memory">
            {MEMORY_KINDS.map((k) => {
              const Icon = KIND_ICON[k];
              const active = k === kind;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setKind(k);
                    setFile(null);
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
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
            <Input
              id="m-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11"
              placeholder={textOnly ? "The summer at the lake" : "My 30th birthday"}
            />
          </div>
          {!textOnly && (
            <div className="grid gap-2">
              <Label htmlFor="m-file">{KIND_LABEL[kind]} file</Label>
              <label
                htmlFor="m-file"
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-input px-4 py-5 text-sm text-muted-foreground hover:border-primary/50"
              >
                <Upload className="size-5 text-primary" />
                <span className="truncate">
                  {file ? file.name : `Choose a ${KIND_LABEL[kind].toLowerCase()} (up to 50 MB)`}
                </span>
              </label>
              <input
                id="m-file"
                type="file"
                accept={acceptFor(kind)}
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="m-body">{textOnly ? "Write it down" : "Caption (optional)"}</Label>
            <Textarea
              id="m-body"
              rows={textOnly ? 6 : 3}
              required={textOnly}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>How does it feel? (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  aria-pressed={emotion === em}
                  onClick={() => setEmotion(emotion === em ? null : em)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    emotion === em
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {EMOTION_LABEL[em]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="m-date">When did it happen? (optional)</Label>
            <Input id="m-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
          </div>
          <div className="grid gap-2">
            <Label>Who can see it</Label>
            <PrivacyPicker value={privacy} onChange={setPrivacy} />
          </div>
          <Button type="submit" variant="hero" size="lg" className="mt-2 h-11 rounded-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Preserve memory
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
