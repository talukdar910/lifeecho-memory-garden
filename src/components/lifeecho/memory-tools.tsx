import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Flag, Languages, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { profileQuery } from "@/lib/archive";
import { languageName } from "@/lib/locales";
import { resolveReaderLanguage, validateReportReason } from "@/lib/memory-rules";
import { translateMemory } from "@/lib/translate.functions";

/** The reader's language: their profile choice, else the browser's, else English. */
export function useReaderLanguage(): string {
  const { user } = useAuth();
  const { data } = useQuery({ ...profileQuery(), enabled: !!user });
  const [browser, setBrowser] = useState<string | null>(null);
  useEffect(() => setBrowser(navigator.language), []);
  return resolveReaderLanguage(data?.profile?.preferred_language, browser);
}

export interface Translation {
  title: string;
  body: string | null;
  language: string;
}

export function TranslateButton({
  memoryId,
  translation,
  onChange,
}: {
  memoryId: string;
  translation: Translation | null;
  onChange: (t: Translation | null) => void;
}) {
  const language = useReaderLanguage();
  const translate = useServerFn(translateMemory);
  const [busy, setBusy] = useState(false);

  if (translation) {
    return (
      <button
        type="button"
        onClick={() => onChange(null)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Undo2 className="size-3.5" /> Show original
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await translate({ data: { memoryId, language } });
          onChange({ title: res.title, body: res.body, language: res.language });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not translate this memory.");
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 px-2.5 py-1 font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Languages className="size-3.5" />}
      {busy ? "Translating…" : `Translate to ${languageName(language)}`}
    </button>
  );
}

export function ReportButton({ memoryId, title }: { memoryId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const invalid = validateReportReason(reason);
    if (invalid) return void toast.error(invalid);
    setBusy(true);
    const { error } = await supabase.rpc("report_memory", { _memory_id: memoryId, _reason: reason.trim() });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Thank you. Our team will review this memory.");
    setReason("");
    setOpen(false);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
        aria-label="Report this memory"
      >
        <Flag />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report “{title}”</DialogTitle>
            <DialogDescription>Tell the LifeEcho team what's wrong. The owner won't see who reported it.</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="For example: it shares someone's private details"
            aria-label="Reason"
            maxLength={1000}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="hero" onClick={send} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Send report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
