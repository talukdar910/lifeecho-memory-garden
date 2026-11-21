import { useState, type FormEvent } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Hourglass, Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { legacyContactsQuery, requireUserId } from "@/lib/archive";
import { normalizeContactEmail, validateLegacyContact } from "@/lib/memory-rules";

/** The people who may see this member's Legacy memories after a verified passing. */
export function LegacyContacts({ ownEmail, locked }: { ownEmail: string; locked?: boolean }) {
  const qc = useQueryClient();
  const { data: contacts } = useSuspenseQuery(legacyContactsQuery());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    const err = validateLegacyContact(email, ownEmail, contacts.map((c) => c.contact_email));
    if (err) return void toast.error(err);
    setBusy(true);
    try {
      const uid = await requireUserId();
      const { error } = await supabase.from("legacy_contacts").insert({
        owner_id: uid,
        contact_email: normalizeContactEmail(email),
        contact_name: name.trim() || null,
      });
      if (error) throw error;
      setName("");
      setEmail("");
      toast.success("Legacy contact added.");
      await qc.invalidateQueries({ queryKey: ["legacy-contacts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add this contact");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("legacy_contacts").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success("Legacy contact removed.");
    await qc.invalidateQueries({ queryKey: ["legacy-contacts"] });
  }

  return (
    <section id="legacy-contacts" className="glass-panel mt-8 scroll-mt-24 rounded-3xl p-6 md:p-8">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-aurora text-primary-foreground">
          <Hourglass className="size-5" />
        </span>
        <div>
          <h2 className="text-2xl font-semibold">Legacy contacts</h2>
          <p className="text-sm text-muted-foreground">
            Only these people can open your Legacy memories, and only after your passing is formally verified.
          </p>
        </div>
      </div>

      {contacts.length > 0 ? (
        <ul className="mt-6 divide-y divide-border rounded-2xl border border-border">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.contact_name || c.contact_email}</p>
                {c.contact_name && <p className="truncate text-xs text-muted-foreground">{c.contact_email}</p>}
              </div>
              {!locked && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(c.id)}
                  aria-label={`Remove ${c.contact_name || c.contact_email}`}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
          No legacy contacts yet. Add the family members or friends you trust.
        </p>
      )}

      {!locked && (
        <form onSubmit={add} className="mt-6 grid gap-3 sm:grid-cols-[1fr_1.3fr_auto] sm:items-end">
          <div className="grid gap-2">
            <Label htmlFor="lc-name">Name (optional)</Label>
            <Input id="lc-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11" placeholder="Amira" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lc-email">Their email</Label>
            <Input id="lc-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" placeholder="amira@example.com" />
          </div>
          <Button type="submit" variant="hero" className="h-11 rounded-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <UserPlus />} Add
          </Button>
        </form>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        They'll need a LifeEcho account with this email to see your Legacy memories in the Memory Archive.
      </p>
    </section>
  );
}
