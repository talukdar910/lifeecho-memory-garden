import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { adminArchiveQuery } from "@/lib/admin";
import { formatProfileNumber, lifespan, profileSlug } from "@/lib/memory-rules";

export function AdminArchive() {
  const qc = useQueryClient();
  const { data: entries = [], isLoading } = useQuery(adminArchiveQuery());
  const [busy, setBusy] = useState<string | null>(null);

  async function setPublished(id: string, published: boolean) {
    setBusy(id);
    const { error } = await supabase.rpc("set_archive_published", { _entry_id: id, _published: published });
    setBusy(null);
    if (error) return void toast.error(error.message);
    toast.success(published ? "Profile is visible in the Memory Archive." : "Profile hidden from the Memory Archive.");
    await Promise.all([qc.invalidateQueries({ queryKey: ["admin"] }), qc.invalidateQueries({ queryKey: ["archive"] })]);
  }

  if (isLoading) return <Loader2 className="animate-spin text-muted-foreground" />;
  if (!entries.length) return <p className="text-sm text-muted-foreground">No archived profiles yet.</p>;
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
      {entries.map((e) => (
        <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
          <span className="w-24 text-sm font-semibold text-primary">{formatProfileNumber(e.profile_number)}</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {e.full_name}
              {e.is_demo && <span className="ml-2 text-xs font-normal text-muted-foreground">Demo</span>}
            </p>
            <p className="text-sm text-muted-foreground">{lifespan(e.date_of_birth, e.date_of_death)}</p>
          </div>
          <span className={`text-xs font-medium ${e.published ? "text-success" : "text-muted-foreground"}`}>
            {e.published ? "Visible" : "Hidden"}
          </span>
          <Button asChild size="sm" variant="glass">
            <Link to="/archive/$number" params={{ number: profileSlug(e.profile_number) }}>Open</Link>
          </Button>
          <Button size="sm" variant="outline" disabled={busy === e.id} onClick={() => setPublished(e.id, !e.published)}>
            {busy === e.id ? <Loader2 className="animate-spin" /> : e.published ? <EyeOff /> : <Eye />}
            {e.published ? "Hide" : "Show"}
          </Button>
        </li>
      ))}
    </ul>
  );
}
