import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES } from "@/lib/locales";
import { MIN_PASSWORD_LENGTH, validateSignup } from "@/lib/memory-rules";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { LogoMark } from "@/components/lifeecho/logo";
import { Particles } from "@/components/lifeecho/particles";

type Mode = "signin" | "signup" | "forgot";

function safePath(p?: string) {
  return p && p.startsWith("/") && !p.startsWith("//") ? p : "/dashboard";
}

export const Route = createFileRoute("/auth")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { mode?: "signin" | "signup" | undefined; redirect?: string | undefined } => ({
    mode: s["mode"] === "signup" ? "signup" : s["mode"] === "signin" ? "signin" : undefined,
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
  }),
  ssr: false,
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: safePath(search.redirect) });
  },
  head: () => ({
    meta: [
      { title: "Sign in or join — LifeEcho" },
      { name: "description", content: "Create your LifeEcho account or sign in to your Memory Archive." },
      { property: "og:title", content: "Sign in or join — LifeEcho" },
      { property: "og:description", content: "Create your LifeEcho account or sign in to your Memory Archive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="!size-[18px]">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const target = safePath(search.redirect);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const invalid = validateSignup({ fullName: name, email, password, dateOfBirth: dob, country });
        if (invalid) {
          toast.error(invalid);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + target,
            data: { full_name: name.trim(), display_name: name.trim(), date_of_birth: dob, country },
          },
        });
        if (error) throw error;
        if (data.session) navigate({ to: target });
        else setSentTo(email);
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: target });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Check your inbox for a link to reset your password.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    if (result.redirected) return;
    navigate({ to: target });
  }

  if (sentTo) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-aurora text-primary-foreground">
          <MailCheck className="size-6" />
        </div>
        <h1 className="mt-6 text-4xl font-semibold">Confirm your email</h1>
        <p className="mt-3 text-muted-foreground">
          We sent a confirmation link to <span className="text-foreground">{sentTo}</span>. Open it to activate your
          LifeEcho account.
        </p>
        <Button variant="glass" className="mt-8" onClick={() => { setSentTo(null); setMode("signin"); }}>
          Back to sign in
        </Button>
      </div>
    );
  }

  const title = mode === "signup" ? "Create your account" : mode === "signin" ? "Welcome back" : "Reset your password";

  return (
    <div className="relative">
      <Particles />
      <div className="relative mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-5 py-14">
        <div className="glass-panel rounded-3xl p-7 md:p-9">
          <LogoMark className="size-10" />
          <h1 className="mt-5 text-4xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Begin preserving the stories of the people you love."
              : mode === "signin"
                ? "Sign in to your Memory Archive."
                : "We'll email you a secure link."}
          </p>

          {mode !== "forgot" && (
            <div className="mt-7 grid gap-3">
              <Button type="button" variant="google" size="lg" className="h-11 rounded-full" onClick={() => social("google")}>
                <GoogleLogo /> Continue with Google
              </Button>
              <Button type="button" variant="outline" size="lg" className="h-11 rounded-full bg-transparent" onClick={() => social("lovable")}>
                <LovableMark className="!size-[18px]" /> Continue with Lovable
              </Button>
              <div className="my-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className={`grid gap-4 ${mode === "forgot" ? "mt-7" : ""}`}>
            {mode === "signup" && (
              <div className="grid gap-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="h-11" />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="h-11" />
            </div>
            {mode !== "forgot" && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="h-11"
                />
              </div>
            )}
            {mode === "signup" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="dob">Date of birth</Label>
                  <Input id="dob" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} autoComplete="bday" className="h-11" />
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
            )}
            {mode === "signup" && (
              <p className="text-xs text-muted-foreground">You'll add a profile picture right after your first sign-in.</p>
            )}
            <Button type="submit" variant="hero" size="lg" className="mt-2 h-11 rounded-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {mode === "signup" ? "Create account" : mode === "signin" ? "Sign in" : "Send reset link"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? (
              <>Already a member? <button className="text-primary hover:underline" onClick={() => setMode("signin")}>Sign in</button></>
            ) : mode === "signin" ? (
              <>New to LifeEcho? <button className="text-primary hover:underline" onClick={() => setMode("signup")}>Create an account</button></>
            ) : (
              <button className="text-primary hover:underline" onClick={() => setMode("signin")}>Back to sign in</button>
            )}
          </p>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Back to LifeEcho</Link>
        </p>
      </div>
    </div>
  );
}
