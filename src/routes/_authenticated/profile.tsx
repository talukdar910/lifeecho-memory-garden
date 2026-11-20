import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/lifeecho/status-badge";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery, removeMedia, uploadFile, useMediaUrls } from "@/lib/archive";
import { COUNTRIES } from "@/lib/locales";
import { MAX_UPLOAD_BYTES, validateBirthDate } from "@/lib/memory-rules";

export const Route = createFileRoute("/_authenticated/profile")({
  validateSearch: (s: Record<string, unknown>): { setup?: boolean | undefined } => ({
    setup: s["setup"] === true || s["setup"] === "true" ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Your profile — LifeEcho" },
      { name: "description", content: "Your LifeEcho profile: name, date of birth, country and portrait." },
      { property: "og:title", content: "Your profile — LifeEcho" },
      { property: "og:description", content: "Your Life. Your Emotions. Your Legacy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQuery()),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { setup } = Route.useSearch();
  const { data: me } = useSuspenseQuery(profileQuery());
  const p = me.profile;
  const [fullName, setFullName] = useState(p?.full_name ?? p?.display_name ?? "");
  const [dob, setDob] = useState(p?.date_of_birth ?? "");
  const [country, setCountry] = useState(p?.country ?? "");
  const [bio, setBio] = useState(p?.bio ?? "");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: urls } = useMediaUrls([p?.avatar_url]);
  const preview = avatar ? URL.createObjectURL(avatar) : p?.avatar_url ? urls?.[p.avatar_url] : undefined;

  async function save(e: FormEvent) {
    e.preventDefault();
    const dobErr = validateBirthDate(dob);
    if (dobErr) return void toast.error(dobErr);
    if (!country) return void toast.error("Please choose your country.");
    if (!avatar && !p?.avatar_url) return void toast.error("Please add a profile picture.");
    if (avatar && (!avatar.type.startsWith("image/") || avatar.size > MAX_UPLOAD_BYTES))
      return void toast.error("Your picture must be an image of 50 MB or less.");
    setBusy(true);
    try {
      let avatar_url = p?.avatar_url ?? null;
      if (avatar) {
        avatar_url = await uploadFile(avatar, "avatar");
        if (p?.avatar_url) await removeMedia([p.avatar_url]);
      }
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), date_of_birth: dob, country, bio: bio.trim() || null, avatar_url })
        .eq("id", me.userId);
      if (error) throw error;
      setAvatar(null);
      toast.success(setup ? "Welcome to LifeEcho." : "Profile saved.");
      await qc.invalidateQueries({ queryKey: ["profile"] });
      if (setup) navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      {setup && (
        <div className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-sm">
          <p className="font-semibold">One last step to finish registering</p>
          <p className="mt-1 text-muted-foreground">
            Add a profile picture and check your details. Every LifeEcho member needs a full name, date of birth,
            country and photo.
          </p>
        </div>
      )}
      <p className="eyebrow">Your profile</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-4xl font-semibold">{fullName || "Your details"}</h1>
        <StatusBadge status={p?.status} />
      </div>
      <form onSubmit={save} className="glass-panel mt-8 grid gap-5 rounded-3xl p-6 md:p-8">
        <label className="group flex cursor-pointer items-center gap-4">
          <span className="relative size-24 overflow-hidden rounded-full bg-aurora">
            {preview && <img src={preview} alt="Your profile picture" className="size-full object-cover" />}
            <span className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="size-6" />
            </span>
          </span>
          <span className="text-sm text-muted-foreground">
            {p?.avatar_url || avatar ? "Change profile picture" : "Add a profile picture (required)"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Profile picture"
            onChange={(e) => setAvatar(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="grid gap-2">
          <Label htmlFor="p-name">Full name</Label>
          <Input id="p-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="p-email">Email</Label>
          <Input id="p-email" value={me.email} disabled className="h-11" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="p-dob">Date of birth</Label>
            <Input id="p-dob" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className="h-11" />
          </div>
          <div className="grid gap-2">
            <Label>Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="h-11" aria-label="Country">
                <SelectValue placeholder="Choose country" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="p-bio">A few words about you (optional)</Label>
          <Textarea id="p-bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <Button type="submit" variant="hero" size="lg" className="h-11 rounded-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} {setup ? "Finish registration" : "Save profile"}
        </Button>
      </form>
    </div>
  );
}
