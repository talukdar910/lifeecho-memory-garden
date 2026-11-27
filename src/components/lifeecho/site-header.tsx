import { Link } from "@tanstack/react-router";
import { Landmark, Menu, LogOut } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAdminQuery } from "@/lib/archive";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth, useSignOut } from "@/lib/auth-context";
import { Logo } from "./logo";

const memberLinks = [
  { to: "/community", label: "Community" },
  { to: "/archive", label: "Memory Archive" },
  { to: "/dashboard", label: "My memories" },
  { to: "/verify", label: "Report a passing" },
  { to: "/profile", label: "Profile" },
] as const;

export function SiteHeader() {
  const { user, ready } = useAuth();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);
  const { data: isAdmin } = useQuery({ ...isAdminQuery(), enabled: !!user });
  const links = user && isAdmin ? [...memberLinks, { to: "/admin", label: "Admin" } as const] : memberLinks;

  return (
    <header style={{ paddingTop: "env(safe-area-inset-top)" }} className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {user &&
            links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:text-foreground ${l.to === "/archive" ? "border border-memorial-line text-memorial-gold" : "text-muted-foreground"}`}
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {l.to === "/archive" && <Landmark className="size-4" />}{l.label}
              </Link>
            ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {ready && !user && (
            <>
              <Button asChild variant="ghost">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild variant="hero" className="rounded-full">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Create account
                </Link>
              </Button>
            </>
          )}
          {user && (
            <Button variant="ghost" onClick={signOut}>
              <LogOut /> Sign out
            </Button>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-background">
            <SheetTitle className="font-display text-2xl">Menu</SheetTitle>
            <div className="mt-8 flex flex-col gap-2" onClick={() => setOpen(false)}>
              {user ? (
                <>
                  {links.map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      className="rounded-xl px-4 py-3 text-base text-muted-foreground hover:bg-secondary hover:text-foreground"
                      activeProps={{ className: "bg-secondary text-foreground" }}
                    >
                      {l.label}
                    </Link>
                  ))}
                  <Button variant="glass" className="mt-4" onClick={signOut}>
                    <LogOut /> Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="hero">
                    <Link to="/auth" search={{ mode: "signup" }}>
                      Create account
                    </Link>
                  </Button>
                  <Button asChild variant="glass">
                    <Link to="/auth">Sign in</Link>
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
