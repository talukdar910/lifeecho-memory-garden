import { useState, type FormEvent } from "react";
import { Loader2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_VISIBILITY, validateMemoryFile, type NewMemorialInput, type Visibility } from "@/lib/memory-rules";
import { toast } from "sonner";

export interface MemorialFormValues extends NewMemorialInput {
  visibility: Visibility;
}

export function MemorialForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<MemorialFormValues>;
  submitLabel: string;
  onSubmit: (values: MemorialFormValues, cover: File | null) => Promise<void>;
}) {
  const [v, setV] = useState<MemorialFormValues>({
    full_name: initial?.full_name ?? "",
    birth_date: initial?.birth_date ?? "",
    death_date: initial?.death_date ?? "",
    birthplace: initial?.birthplace ?? "",
    epitaph: initial?.epitaph ?? "",
    biography: initial?.biography ?? "",
    visibility: initial?.visibility ?? DEFAULT_VISIBILITY,
  });
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof MemorialFormValues) => (e: { target: { value: string } }) =>
    setV((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (cover) {
      const err = validateMemoryFile("photo", cover);
      if (err) { toast.error(err); return; }
    }
    setBusy(true);
    try {
      await onSubmit(v, cover);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" required value={v.full_name} onChange={set("full_name")} className="h-11" placeholder="e.g. Amina Rahman" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="birth_date">Date of birth</Label>
          <Input id="birth_date" type="date" value={v.birth_date ?? ""} onChange={set("birth_date")} className="h-11" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="death_date">Date of passing</Label>
          <Input id="death_date" type="date" value={v.death_date ?? ""} onChange={set("death_date")} className="h-11" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="birthplace">Place of birth</Label>
        <Input id="birthplace" value={v.birthplace ?? ""} onChange={set("birthplace")} className="h-11" placeholder="City, country" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="epitaph">A few words to remember them by</Label>
        <Input id="epitaph" value={v.epitaph ?? ""} onChange={set("epitaph")} className="h-11" placeholder="Loved by all, forgotten by none." />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="biography">Their life story</Label>
        <Textarea id="biography" rows={6} value={v.biography ?? ""} onChange={set("biography")} placeholder="Where they grew up, what they loved, the mark they left…" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="cover">Portrait photo</Label>
        <label htmlFor="cover" className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-input px-4 py-4 text-sm text-muted-foreground hover:border-primary/50">
          <ImagePlus className="size-5 text-primary" />
          {cover ? cover.name : "Choose a photo (optional)"}
        </label>
        <input id="cover" type="file" accept="image/*" className="sr-only" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
      </div>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/50 px-4 py-4">
        <div>
          <p className="text-sm font-semibold">Share publicly</p>
          <p className="text-xs text-muted-foreground">
            {v.visibility === "public" ? "Anyone with the link can view this memorial." : "Only you can see this memorial."}
          </p>
        </div>
        <Switch
          checked={v.visibility === "public"}
          onCheckedChange={(c) => setV((s) => ({ ...s, visibility: c ? "public" : "private" }))}
          aria-label="Share publicly"
        />
      </div>
      <Button type="submit" variant="hero" size="xl" disabled={busy}>
        {busy && <Loader2 className="animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}
