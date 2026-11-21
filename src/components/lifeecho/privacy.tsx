import { Check, ChevronDown, Globe2, Hourglass, Lock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PRIVACY_HINT, PRIVACY_LABEL, PRIVACY_OPTIONS, type Privacy } from "@/lib/memory-rules";

export const PRIVACY_ICON: Record<Privacy, typeof Lock> = {
  private: Lock,
  legacy: Hourglass,
  public: Globe2,
};

/** Three side-by-side cards for choosing who can see a memory. */
export function PrivacyPicker({ value, onChange }: { value: Privacy; onChange: (p: Privacy) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Who can see it">
      {PRIVACY_OPTIONS.map((p) => {
        const Icon = PRIVACY_ICON[p];
        const active = value === p;
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p)}
            className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors sm:flex-col sm:gap-2 ${
              active ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
            }`}
          >
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                active ? "bg-aurora text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              <Icon className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{PRIVACY_LABEL[p]}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{PRIVACY_HINT[p]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Compact pill showing a memory's visibility; becomes a menu when the owner can change it. */
export function PrivacyMenu({
  value,
  onChange,
}: {
  value: Privacy;
  onChange?: ((p: Privacy) => void) | undefined;
}) {
  const Icon = PRIVACY_ICON[value] ?? Lock;
  const pill = (
    <>
      <Icon className="size-3" />
      {PRIVACY_LABEL[value] ?? value}
    </>
  );
  const pillClass = `inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
    value === "public" ? "border-primary/40 text-primary" : "border-border text-muted-foreground"
  }`;
  if (!onChange) return <span className={pillClass}>{pill}</span>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={`${pillClass} hover:text-foreground`} aria-label={`Visibility: ${PRIVACY_LABEL[value]}. Change`}>
        {pill}
        <ChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {PRIVACY_OPTIONS.map((p) => {
          const ItemIcon = PRIVACY_ICON[p];
          return (
            <DropdownMenuItem key={p} onSelect={() => p !== value && onChange(p)} className="items-start gap-3 py-2">
              <ItemIcon className="mt-0.5 size-4 text-primary" />
              <span className="flex-1">
                <span className="block text-sm font-medium">{PRIVACY_LABEL[p]}</span>
                <span className="block text-xs text-muted-foreground">{PRIVACY_HINT[p]}</span>
              </span>
              {p === value && <Check className="mt-0.5 size-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
