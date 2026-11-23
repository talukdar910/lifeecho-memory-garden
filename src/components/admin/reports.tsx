import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, EyeOff, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { adminContentReportsQuery } from "@/lib/admin";
import { PRIVACY_LABEL, type Privacy } from "@/lib/memory-rules";

const STATUS_LABEL: Record<string, string> = { open: "Open", actioned: "Memory hidden", dismissed: "Dismissed" };

export function AdminReports() {
  const qc = useQueryClient();
  const { data: reports = [], isLoading } = useQuery(adminContentReportsQuery());
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });

  async function resolve(id: string, hide: boolean) {
    setBusy(id);
    const { error } = await supabase.rpc("resolve_content_report", { _report_id: id, _hide_memory: hide });
    setBusy(null);
    if (error) return void toast.error(error.message);
    toast.success(hide ? "Memory hidden from everyone but its owner." : "Report dismissed.");
    await refresh();
  }
  async function restore(memoryId: string, reportId: string) {
    setBusy(reportId);
    const { error } = await supabase.rpc("set_memory_hidden", { _memory_id: memoryId, _hidden: false });
    setBusy(null);
    if (error) return void toast.error(error.message);
    toast.success("Memory restored.");
    await refresh();
  }

  if (isLoading) return <Loader2 className="animate-spin text-muted-foreground" />;
  if (!reports.length) return <p className="text-sm text-muted-foreground">No memories have been reported.</p>;
  return (
    <div className="grid gap-4">
      {reports.map((r) => {
        const m = r.life_memories;
        return (
          <article key={r.id} className="glass-panel rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold tracking-wider text-primary uppercase">
                  {STATUS_LABEL[r.status] ?? r.status} · {format(new Date(r.created_at), "d MMM yyyy, HH:mm")}
                </p>
                <h3 className="mt-1 text-2xl font-semibold">{m?.title ?? "Deleted memory"}</h3>
                <p className="text-sm text-muted-foreground">
                  By {r.ownerName}
                  {m && ` · ${PRIVACY_LABEL[m.privacy as Privacy] ?? m.privacy}`}
                  {m?.hidden && " · hidden"}
                </p>
              </div>
            </div>
            {m?.body && <p className="mt-3 line-clamp-4 text-sm whitespace-pre-line text-muted-foreground">{m.body}</p>}
            <p className="mt-3 rounded-xl bg-secondary px-4 py-3 text-sm">
              <span className="font-medium">{r.reporterName}:</span> {r.reason}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {r.status === "open" && m && (
                <>
                  <Button size="sm" variant="hero" className="rounded-full" disabled={busy === r.id} onClick={() => resolve(r.id, true)}>
                    {busy === r.id ? <Loader2 className="animate-spin" /> : <EyeOff />} Hide memory
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-full" disabled={busy === r.id} onClick={() => resolve(r.id, false)}>
                    <Check /> Dismiss
                  </Button>
                </>
              )}
              {m?.hidden && r.status !== "open" && (
                <Button size="sm" variant="outline" className="rounded-full" disabled={busy === r.id} onClick={() => restore(m.id, r.id)}>
                  <RotateCcw /> Restore memory
                </Button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
