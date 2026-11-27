import { Link } from "@tanstack/react-router";
import { Home, Landmark, User, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const tabs = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/community", label: "Community", icon: Users },
  { to: "/archive", label: "Archive", icon: Landmark },
  { to: "/profile", label: "Profile", icon: User },
] as const;

/** App-style bottom navigation for signed-in members on phones. */
export function MobileTabBar() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-4">
        {tabs.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-medium text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
