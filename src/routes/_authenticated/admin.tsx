import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, Check, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminOverview } from "@/components/admin/overview";
import { AdminMembers } from "@/components/admin/members";
import { AdminArchive } from "@/components/admin/archive-admin";
import { AdminReports } from "@/components/admin/reports";
import { AdminSecurityLog } from "@/components/admin/security-log";
import { supabase } from "@/integrations/supabase/client";
import { allDeathReportsQuery, isAdminQuery, PROOF_BUCKET } from "@/lib/archive";
import { REPORT_STATUS_LABEL, type DeathReportStatus } from "@/lib/memory-rules";
import type { Tables } from "@/integrations/supabase/types";

const TABS = [
  ["overview", "Overview"],
  ["verifications", "Verifications"],
  ["members", "Members"],
  ["archive", "Archive"],
  ["reports", "Reported content"],
  ["security", "Security log"],
] as const;
type Tab = (typeof TABS)[number][0];

export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab | undefined } => ({
    tab: TABS.some(([t]) => t === s["tab"]) ? (s["tab"] as Tab) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Admin panel · LifeEcho" },
      { name: "description", content: "Manage LifeEcho members, verifications, the Memory Archive, reported content and the security log." },
      { property: "og:title", content: "Admin panel · LifeEcho" },
      { property: "og:description", content: "LifeEcho administration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(isAdminQuery()),
  component: AdminPage,
});

function AdminPage() {
  const { data: isAdmin } = useSuspenseQuery(isAdminQuery());
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-4xl font-semibold">Administrators only</h1>
        <p className="mt-3 text-muted-foreground">This area is reserved for the LifeEcho team.</p>
        <Button asChild variant="glass" className="mt-6">
          <Link to="/dashboard">Back to my memories</Link>
        </Button>
      </div>
    );
  }
  return <AdminPanel />;
}

function AdminPanel() {
  const { tab = "overview" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const open = (t: string) => navigate({ search: { tab: t as Tab }, replace: true });
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <p className="eyebrow">Admin panel</p>
      <h1 className="mt-3 text-4xl font-semibold md:text-5xl">LifeEcho control room</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">Members, verifications, the Memory Archive and safety — in one place.</p>
      <Tabs value={tab} onValueChange={open} className="mt-8">
        <div className="-mx-5 overflow-x-auto px-5 pb-1">
          <TabsList className="h-11 rounded-full bg-secondary/70 p-1">
            {TABS.map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="rounded-full px-4 data-[state=active]:bg-aurora data-[state=active]:text-primary-foreground">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="overview" className="mt-8"><AdminOverview onOpen={open} /></TabsContent>
        <TabsContent value="verifications" className="mt-2"><Verifications /></TabsContent>
        <TabsContent value="members" className="mt-8"><AdminMembers /></TabsContent>
        <TabsContent value="archive" className="mt-8"><AdminArchive /></TabsContent>
        <TabsContent value="reports" className="mt-8"><AdminReports /></TabsContent>
        <TabsContent value="security" className="mt-8"><AdminSecurityLog /></TabsContent>
      </Tabs>
    </div>
  );
}

function Verifications() {
  const { data: reports = [], isLoading } = useQuery(allDeathReportsQuery());
  const pending = reports.filter((r) => r.status === "pending");
  const reviewed = reports.filter((r) => r.status !== "pending");
  return (
    <div>
      <p className="mt-6 max-w-xl text-muted-foreground">
        Check each proof carefully. Approving turns the profile black, gives it the next archive number and opens its
        legacy memories in the Memory Archive.
      </p>
      <h2 className="mt-8 text-2xl font-semibold">Waiting for review ({pending.length})</h2>
      {isLoading ? (
        <Loader2 className="mt-6 animate-spin text-muted-foreground" />
      ) : pending.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nothing to review right now.</p>
      ) : (
        <div className="mt-4 grid gap-4">
          {pending.map((r) => (
            <PendingReport key={r.id} report={r} />
          ))}
        </div>
      )}
      {reviewed.length > 0 && (
        <>
          <h2 className="mt-14 text-2xl font-semibold">Reviewed</h2>
          <ul className="mt-4 divide-y divide-border rounded-2xl border border-border">
            {reviewed.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span className="font-medium">{r.subject_full_name}</span>
                <span className="text-muted-foreground">
                  {REPORT_STATUS_LABEL[r.status as DeathReportStatus] ?? r.status}
                  {r.reviewed_at && ` · ${format(new Date(r.reviewed_at), "d MMM yyyy")}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function PendingReport({ report: r }: { report: Tables<"death_reports"> }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  async function openProof() {
    const { data, error } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(r.proof_path, 300);
    if (error || !data) return void toast.error(error?.message ?? "Could not open the proof");
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function review(approve: boolean) {
    const question = approve
      ? `Approve and move ${r.subject_full_name} into the Memory Archive? This marks their profile as deceased.`
      : `Reject this report about ${r.subject_full_name}?`;
    if (!confirm(question)) return;
    setBusy(approve ? "approve" : "reject");
    const { error } = await supabase.rpc("review_death_report", { _report_id: r.id, _approve: approve, _note: note.trim() });
    setBusy(null);
    if (error) return void toast.error(error.message);
    toast.success(approve ? `${r.subject_full_name} has been added to the Memory Archive.` : "Report rejected.");
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin-death-reports"] }),
      qc.invalidateQueries({ queryKey: ["admin"] }),
      qc.invalidateQueries({ queryKey: ["archive"] }),
    ]);
  }

  return (
    <article className="glass-panel rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold">{r.subject_full_name}</h3>
          <p className="text-sm text-muted-foreground">{r.subject_email}</p>
        </div>
        <Button variant="glass" size="sm" onClick={openProof}>
          <FileText /> View proof
        </Button>
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Date of passing</dt>
          <dd>{format(new Date(r.date_of_death), "d MMM yyyy")}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Reported by</dt>
          <dd>{r.relationship || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Sent</dt>
          <dd>{format(new Date(r.created_at), "d MMM yyyy, HH:mm")}</dd>
        </div>
      </dl>
      {r.notes && <p className="mt-3 rounded-xl bg-secondary px-4 py-3 text-sm">{r.notes}</p>}
      {!r.subject_id && (
        <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4" /> No LifeEcho account uses this email, so it can't be approved.
        </p>
      )}
      <Textarea
        className="mt-4"
        rows={2}
        placeholder="Note for the person who reported (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        aria-label="Review note"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="hero" className="rounded-full" disabled={!!busy || !r.subject_id} onClick={() => review(true)}>
          {busy === "approve" ? <Loader2 className="animate-spin" /> : <Check />} Approve
        </Button>
        <Button variant="outline" className="rounded-full" disabled={!!busy} onClick={() => review(false)}>
          {busy === "reject" ? <Loader2 className="animate-spin" /> : <X />} Reject
        </Button>
      </div>
    </article>
  );
}
