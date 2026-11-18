export function ActiveBadge({ active = true }: { active?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
      <span
        className={`size-2 rounded-full ${active ? "animate-pulse-ring bg-success" : "bg-muted-foreground"}`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}
