import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileCheck2, Loader2, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { ensureCompleteProfile, myDeathReportsQuery, PROOF_BUCKET, uploadFile } from "@/lib/archive";
import {
  REPORT_STATUS_LABEL,
  validateDeathDate,
  validateProofFile,
  type DeathReportStatus,
} from "@/lib/memory-rules";

export const Route = createFileRoute("/_authenticated/verify")({
  head: () => ({
    meta: [
      { title: "Report a passing — LifeEcho" },
      { name: "description", content: "Submit official proof so a member's legacy can be added to the LifeEcho Memory Archive." },
      { property: "og:title", content: "Report a passing — LifeEcho" },
      { property: "og:description", content: "Formal death verification for the LifeEcho Memory Archive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context }) => {
    await ensureCompleteProfile(context.queryClient);
    await context.queryClient.ensureQueryData(myDeathReportsQuery());
  },
  component: VerifyPage,
});

const STATUS_STYLE: Record<DeathReportStatus, string> = {
  pending: "border-primary/30 bg-primary/10 text-primary",
  approved: "border-success/30 bg-success/10 text-success",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
};

function VerifyPage() {
  const qc = useQueryClient();
  const { data: reports } = useSuspenseQuery(myDeathReportsQuery());
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [relationship, setRelationship] = useState("");
  const [notes, setNotes] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const err = validateDeathDate(date) ?? validateProofFile(proof);
    if (err) return void toast.error(err);
    setBusy(true);
    try {
      const proofPath = await uploadFile(proof!, "proof", PROOF_BUCKET);
      const { error } = await supabase.rpc("submit_death_report", {
        _full_name: fullName.trim(),
        _email: email.trim(),
        _date_of_death: date,
        _relationship: relationship.trim(),
        _notes: notes.trim(),
        _proof_path: proofPath,
      });
      if (error) throw error;
      toast.success("Thank you. Our team will review the proof carefully.");
      setFullName("");
      setEmail("");
      setDate("");
      setRelationship("");
      setNotes("");
      setProof(null);
      await qc.invalidateQueries({ queryKey: ["my-death-reports"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send this report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <p className="eyebrow">Death verification</p>
        <h1 className="mt-3 text-4xl font-semibold md:text-5xl">Report a member's passing</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          We're sorry for your loss. Send official proof and an administrator will verify it. Once approved, their
          profile turns black, receives an archive number, and the memories they chose as their legacy join the
          Memory Archive.
        </p>
        <form onSubmit={submit} className="glass-panel mt-8 grid gap-5 rounded-3xl p-6 md:p-8">
          <div className="grid gap-2">
            <Label htmlFor="v-name">Their full name</Label>
            <Input id="v-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="v-email">Email of their LifeEcho account</Label>
            <Input id="v-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="v-date">Date of passing</Label>
              <Input id="v-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="v-rel">Your relationship to them</Label>
              <Input id="v-rel" required placeholder="Daughter, friend, lawyer…" value={relationship} onChange={(e) => setRelationship(e.target.value)} className="h-11" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="v-proof">Official proof</Label>
            <label
              htmlFor="v-proof"
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-input px-4 py-5 text-sm text-muted-foreground hover:border-primary/50"
            >
              <Upload className="size-5 shrink-0 text-primary" />
              <span className="truncate">{proof ? proof.name : "Death certificate or official document — PDF or image, up to 20 MB"}</span>
            </label>
            <input
              id="v-proof"
              type="file"
              accept="application/pdf,image/*"
              className="sr-only"
              onChange={(e) => setProof(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="v-notes">Anything the reviewer should know (optional)</Label>
            <Textarea id="v-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            Proof documents are stored privately and seen only by LifeEcho administrators.
          </p>
          <Button type="submit" variant="hero" size="lg" className="h-11 rounded-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Send for verification
          </Button>
        </form>
      </div>

      <aside>
        <h2 className="text-2xl font-semibold">Your reports</h2>
        {reports.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">You haven't reported a passing.</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {reports.map((r) => {
              const status = (r.status as DeathReportStatus) ?? "pending";
              return (
                <li key={r.id} className="glass-panel rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{r.subject_full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Passed {format(new Date(r.date_of_death), "d MMM yyyy")} · sent {format(new Date(r.created_at), "d MMM yyyy")}
                      </p>
                    </div>
                    <FileCheck2 className="size-5 shrink-0 text-muted-foreground" />
                  </div>
                  <span className={`mt-3 inline-block rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[status]}`}>
                    {REPORT_STATUS_LABEL[status] ?? r.status}
                  </span>
                  {r.review_note && <p className="mt-2 text-sm text-muted-foreground">“{r.review_note}”</p>}
                </li>
              );
            })}
          </ul>
        )}
      </aside>
    </div>
  );
}
