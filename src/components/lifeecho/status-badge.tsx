import { statusColor } from "@/lib/memory-rules";

export function ActiveBadge({ active = true }: { active?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
      <span
        className={`size-2 rounded-full ${active ? "animate-pulse-ring bg-success" : "bg-muted-foreground"}`}
      />
      {active ? "Alive & active" : "Inactive"}
    </span>
  );
}

/** Green while alive and active; black once a passing has been verified. */
export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (statusColor(status) === "black") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-background px-3 py-1 text-xs font-semibold text-foreground">
        <span className="size-2 rounded-full bg-background ring-2 ring-foreground/70" />
        In memory
      </span>
    );
  }
  return <ActiveBadge active={status !== "inactive"} />;
}
