import { useQuery } from "@tanstack/react-query";
import { Archive, BookHeart, Flag, Globe2, ShieldCheck, Users } from "lucide-react";
import { adminStatsQuery } from "@/lib/admin";

export function AdminOverview({ onOpen }: { onOpen: (tab: string) => void }) {
  const { data: s } = useQuery(adminStatsQuery());
  const cards = [
    { label: "Members", value: s?.members, hint: `${s?.active ?? "–"} alive & active`, icon: Users, tab: "members" },
    { label: "Memory Archive", value: s?.archive, hint: `${s?.archived ?? "–"} verified passings`, icon: Archive, tab: "archive" },
    { label: "Memories", value: s?.memories, hint: `${s?.publicMemories ?? "–"} public · ${s?.hiddenMemories ?? "–"} hidden`, icon: BookHeart, tab: "reports" },
    { label: "Passings to verify", value: s?.pendingDeaths, hint: "Waiting for proof review", icon: ShieldCheck, tab: "verifications", alert: (s?.pendingDeaths ?? 0) > 0 },
    { label: "Reported memories", value: s?.openReports, hint: "Open reports", icon: Flag, tab: "reports", alert: (s?.openReports ?? 0) > 0 },
    { label: "Public memories", value: s?.publicMemories, hint: "Visible to everyone", icon: Globe2, tab: "members" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ label, value, hint, icon: Icon, tab, alert }) => (
        <button
          key={label}
          type="button"
          onClick={() => onOpen(tab)}
          className="glass-panel group rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40"
        >
          <div className="flex items-center justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            {alert && <span className="size-2.5 animate-pulse-ring rounded-full bg-success" aria-label="Needs attention" />}
          </div>
          <p className="mt-5 font-display text-5xl font-semibold">{value ?? "–"}</p>
          <p className="mt-1 font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </button>
      ))}
    </div>
  );
}
