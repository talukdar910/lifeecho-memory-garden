import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { Loader2, Search, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/lifeecho/status-badge";
import { supabase } from "@/integrations/supabase/client";
import { adminMembersQuery } from "@/lib/admin";
import { useAuth } from "@/lib/auth-context";
import { useMediaUrls } from "@/lib/archive";
import { countryName } from "@/lib/locales";

export function AdminMembers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: members = [], isLoading } = useQuery(adminMembersQuery());
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const { data: urls } = useMediaUrls(members.map((m) => m.avatar_url));

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return members;
    return members.filter((m) =>
      [m.full_name, m.display_name, m.email, countryName(m.country)].some((v) => v?.toLowerCase().includes(s)),
    );
  }, [members, q]);

  async function toggleAdmin(id: string, name: string, makeAdmin: boolean) {
    if (!confirm(makeAdmin ? `Give ${name} admin access?` : `Remove admin access from ${name}?`)) return;
    setBusy(id);
    const { error } = await supabase.rpc("admin_set_admin", { _user_id: id, _make_admin: makeAdmin });
    setBusy(null);
    if (error) return void toast.error(error.message);
    toast.success(makeAdmin ? `${name} is now an admin.` : `${name} is no longer an admin.`);
    await qc.invalidateQueries({ queryKey: ["admin"] });
  }

  return (
    <div>
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or country" className="h-11 rounded-full pl-10" aria-label="Search members" />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{shown.length} of {members.length} members</p>
      {isLoading ? (
        <Loader2 className="mt-6 animate-spin text-muted-foreground" />
      ) : (
        <ul className="mt-4 grid gap-3">
          {shown.map((m) => {
            const name = m.full_name || m.display_name || m.email || "Member";
            return (
              <li key={m.id} className="glass-panel flex flex-wrap items-center gap-4 rounded-2xl p-4">
                <span className="size-12 shrink-0 overflow-hidden rounded-full bg-aurora">
                  {m.avatar_url && urls?.[m.avatar_url] && <img src={urls[m.avatar_url]} alt="" className="size-full object-cover" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {name}
                    {m.isAdmin && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">Admin</span>}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[m.email, countryName(m.country)].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Joined {format(new Date(m.created_at), "d MMM yyyy")} · active{" "}
                    {formatDistanceToNow(new Date(m.last_active_at), { addSuffix: true })}
                  </p>
                </div>
                <StatusBadge status={m.status} />
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="glass">
                    <Link to="/echo/$memberId" params={{ memberId: m.id }}>Public page</Link>
                  </Button>
                  {m.id !== user?.id && (
                    <Button size="sm" variant="outline" disabled={busy === m.id} onClick={() => toggleAdmin(m.id, name, !m.isAdmin)}>
                      {busy === m.id ? <Loader2 className="animate-spin" /> : m.isAdmin ? <ShieldOff /> : <ShieldCheck />}
                      {m.isAdmin ? "Remove admin" : "Make admin"}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
