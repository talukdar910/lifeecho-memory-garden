import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery, removeMedia, uploadMedia, useMediaUrls } from "@/lib/archive";
import { validateMemoryFile } from "@/lib/memory-rules";
import { ActiveBadge } from "@/components/lifeecho/status-badge";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — LifeEcho" },
      { name: "description", content: "Manage your LifeEcho profile and account status." },
      { property: "og:title", content: "Your profile — LifeEcho" },
      { property: "og:description", content: "Manage your LifeEcho profile and account status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQuery()),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const { data: me } = useSuspenseQuery(profileQuery());
  const p = me.profile;
  const [name, setName] = useState(p?.display_name ?? "");
  const [bio, setBio] = useState(p?.bio ?? "");
  const [country, setCountry] = useState(p?.country ?? "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { data: urls } = useMediaUrls([p?.avatar_url]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!p) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() || null, bio: bio.trim() || null, country: country.trim() || null })
      .eq("id", p.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved.");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  async function changeAvatar(file: File | undefined) {
    if (!file || !p) return;
    const err = validateMemoryFile("photo", file);
    if (err) { toast.error(err); return; }
    setUploading(true);
    try {
      const path = await uploadMedia(file, "avatar");
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", p.id);
      if (error) throw error;
      if (p.avatar_url && !/^https?:/.test(p.avatar_url)) await removeMedia([p.avatar_url]);
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Photo updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const display = p?.display_name || me.email.split("@")[0] || "You";

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow">Profile</p>
      <h1 className="mt-3 text-4xl font-semibold md:text-5xl">Your profile</h1>

      <div className="glass-panel mt-8 flex flex-col gap-6 rounded-3xl p-6 sm:flex-row sm:items-center">
        <label className="relative w-fit cursor-pointer">
          <Avatar className="size-24 border border-primary/30">
            {p?.avatar_url && urls?.[p.avatar_url] && <AvatarImage src={urls[p.avatar_url]} alt={display} />}
            <AvatarFallback className="bg-aurora font-display text-4xl text-primary-foreground">{display[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          </span>
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => changeAvatar(e.target.files?.[0])} aria-label="Change profile photo" />
        </label>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-display text-3xl font-semibold">{display}</p>
            <ActiveBadge active={(p?.status ?? "active") === "active"} />
          </div>
          <p className="text-sm text-muted-foreground">{me.email}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Member since {format(new Date(p?.created_at ?? me.createdAt), "d MMMM yyyy")}
            {p && <> · Last active {formatDistanceToNow(new Date(p.last_active_at), { addSuffix: true })}</>}
          </p>
        </div>
      </div>

      <form onSubmit={save} className="glass-panel mt-6 grid gap-5 rounded-3xl p-6">
        <div className="grid gap-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="country">Country</Label>
          <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} className="h-11" placeholder="Where you live" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bio">About you</Label>
          <Textarea id="bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Who are you preserving memories for?" />
        </div>
        <Button variant="hero" size="lg" className="h-11 rounded-full sm:w-fit" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Save profile
        </Button>
      </form>
    </div>
  );
}
