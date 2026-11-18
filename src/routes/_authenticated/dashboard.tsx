import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { BookOpen, Image, Mic, Plus, Video, Archive } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { archiveStatsQuery, memorialsQuery, profileQuery, useMediaUrls } from "@/lib/archive";
import { ActiveBadge } from "@/components/lifeecho/status-badge";
import { MemorialTile } from "@/components/lifeecho/memorial-tile";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — LifeEcho" },
      { name: "description", content: "Your LifeEcho profile status and Memory Archive at a glance." },
      { property: "og:title", content: "Your dashboard — LifeEcho" },
      { property: "og:description", content: "Your LifeEcho profile status and Memory Archive at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(profileQuery()),
      context.queryClient.ensureQueryData(memorialsQuery()),
      context.queryClient.ensureQueryData(archiveStatsQuery()),
    ]),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useSuspenseQuery(profileQuery());
  const { data: memorials } = useSuspenseQuery(memorialsQuery());
  const { data: stats } = useSuspenseQuery(archiveStatsQuery());
  const { data: urls } = useMediaUrls([me.profile?.avatar_url, ...memorials.slice(0, 3).map((m) => m.cover_path)]);
  const name = me.profile?.display_name || me.email.split("@")[0] || "friend";

  const statItems = [
    { icon: Archive, label: "Memorials", value: memorials.length },
    { icon: BookOpen, label: "Stories", value: stats["story"] ?? 0 },
    { icon: Image, label: "Photos", value: stats["photo"] ?? 0 },
    { icon: Video, label: "Videos", value: stats["video"] ?? 0 },
    { icon: Mic, label: "Audio", value: stats["audio"] ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <p className="eyebrow">Dashboard</p>
      <h1 className="mt-3 text-4xl font-semibold md:text-5xl">Welcome, {name}.</h1>

      <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        <section className="glass-panel rounded-3xl p-6" aria-label="Profile status">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border border-primary/30">
              {me.profile?.avatar_url && urls?.[me.profile.avatar_url] && <AvatarImage src={urls[me.profile.avatar_url]} alt={name} />}
              <AvatarFallback className="bg-aurora font-display text-2xl text-primary-foreground">{name[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-display text-2xl font-semibold">{name}</p>
              <p className="truncate text-sm text-muted-foreground">{me.email}</p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3">
            <span className="text-sm text-muted-foreground">Profile status</span>
            <ActiveBadge active={(me.profile?.status ?? "active") === "active"} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-border px-4 py-3">
              <dt className="text-xs text-muted-foreground">Member since</dt>
              <dd className="mt-1 font-semibold">{format(new Date(me.profile?.created_at ?? me.createdAt), "MMM yyyy")}</dd>
            </div>
            <div className="rounded-2xl border border-border px-4 py-3">
              <dt className="text-xs text-muted-foreground">Last active</dt>
              <dd className="mt-1 font-semibold">
                {me.profile ? formatDistanceToNow(new Date(me.profile.last_active_at), { addSuffix: true }) : "just now"}
              </dd>
            </div>
          </dl>
          <Button asChild variant="glass" className="mt-5 w-full">
            <Link to="/profile">Edit profile</Link>
          </Button>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:content-start" aria-label="Archive totals">
          {statItems.map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass-panel rounded-2xl p-5">
              <Icon className="size-5 text-primary" />
              <p className="mt-4 text-4xl font-semibold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
          <div className="col-span-2 flex flex-col justify-between gap-4 rounded-2xl bg-aurora p-6 text-primary-foreground sm:col-span-3 lg:col-span-5 sm:flex-row sm:items-center">
            <div>
              <p className="font-display text-2xl font-semibold">Honour someone today</p>
              <p className="text-sm opacity-80">Open a new memorial in your Memory Archive.</p>
            </div>
            <Button asChild variant="paper" className="rounded-full">
              <Link to="/archive/new"><Plus /> New memorial</Link>
            </Button>
          </div>
        </section>
      </div>

      <div className="mt-14 flex items-end justify-between">
        <h2 className="text-3xl font-semibold">Recent memorials</h2>
        <Link to="/archive" className="text-sm text-primary hover:underline">View archive</Link>
      </div>
      {memorials.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Your archive is empty. Begin with the person you'd most like to remember.</p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {memorials.slice(0, 3).map((m) => (
            <MemorialTile key={m.id} m={m} coverUrl={m.cover_path ? urls?.[m.cover_path] : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
