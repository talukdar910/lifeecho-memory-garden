import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { auditLogQuery } from "@/lib/admin";
import { auditLabel } from "@/lib/memory-rules";

export function AdminSecurityLog() {
  const { data: rows = [], isLoading } = useQuery(auditLogQuery());
  if (isLoading) return <Loader2 className="animate-spin text-muted-foreground" />;
  if (!rows.length) return <p className="text-sm text-muted-foreground">Nothing has been logged yet.</p>;
  return (
    <ol className="relative ml-2 border-l border-border">
      {rows.map((r) => (
        <li key={r.id} className="relative pb-5 pl-6">
          <span className="absolute top-1.5 -left-[5px] size-2.5 rounded-full bg-aurora" />
          <p className="font-medium">{auditLabel(r.action)}</p>
          <p className="text-sm text-muted-foreground">
            {r.actorName} · {format(new Date(r.created_at), "d MMM yyyy, HH:mm")}
          </p>
          {r.target && <p className="truncate font-mono text-xs text-muted-foreground/70">{r.target}</p>}
        </li>
      ))}
    </ol>
  );
}
