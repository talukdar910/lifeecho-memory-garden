import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — LifeEcho" },
      { name: "description", content: "Choose a new password for your LifeEcho account." },
      { property: "og:title", content: "Set a new password — LifeEcho" },
      { property: "og:description", content: "Choose a new password for your LifeEcho account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const isRecovery = typeof window !== "undefined" && window.location.hash.includes("type=recovery");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Your password has been updated.");
    navigate({ to: "/community" });
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-14">
      <form onSubmit={onSubmit} className="glass-panel grid gap-4 rounded-3xl p-8">
        <h1 className="text-4xl font-semibold">Set a new password</h1>
        {!isRecovery && (
          <p className="text-sm text-muted-foreground">Open this page from the reset link in your email.</p>
        )}
        <div className="grid gap-2">
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
        </div>
        <Button variant="hero" className="h-11 rounded-full" disabled={busy}>Update password</Button>
      </form>
    </div>
  );
}
