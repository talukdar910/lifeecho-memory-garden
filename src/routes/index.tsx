import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Image, Video, Mic, Lock, Globe2, Infinity as InfinityIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Particles } from "@/components/lifeecho/particles";
import heroTree from "@/assets/hero-tree.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LifeEcho — Keep their stories alive for generations" },
      {
        name: "description",
        content:
          "LifeEcho is a global digital memory platform to securely preserve the stories, photos, videos and voices of loved ones who have passed.",
      },
      { property: "og:title", content: "LifeEcho — Keep their stories alive for generations" },
      {
        property: "og:description",
        content: "Securely preserve stories, photos, videos and audio of loved ones in a private Memory Archive.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const formats = [
  { icon: BookOpen, title: "Stories", text: "Write down the moments, sayings and lessons that made them who they were." },
  { icon: Image, title: "Photos", text: "Gather albums from every corner of the family into one lasting place." },
  { icon: Video, title: "Videos", text: "Keep birthdays, weddings and everyday laughter exactly as they happened." },
  { icon: Mic, title: "Audio", text: "Hold on to the sound of a voice — a song, a greeting, a bedtime story." },
];

const promises = [
  { icon: Lock, title: "Private by default", text: "Every memorial starts private. Only you decide if and when it is shared." },
  { icon: Globe2, title: "Shared across borders", text: "Invite family anywhere in the world with a single link when you're ready." },
  { icon: InfinityIcon, title: "Built to last", text: "Securely stored so the people you love are remembered by generations to come." },
];

function Index() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img
          src={heroTree}
          alt="A glowing tree of life with points of light rising into the night sky"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-bottom opacity-80 md:object-[center_75%]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/30 to-background" />
        <Particles />
        <div className="mx-auto flex min-h-[86vh] max-w-6xl flex-col justify-start px-5 pt-20 pb-24 md:justify-center md:pt-10">
          <p className="eyebrow animate-fade-up">A global digital memory platform</p>
          <h1 className="mt-5 max-w-3xl animate-fade-up text-5xl leading-[1.02] font-semibold md:text-7xl">
            Every life leaves an <em className="text-aurora not-italic md:italic">echo.</em>
          </h1>
          <p className="mt-6 max-w-xl animate-fade-up text-lg text-muted-foreground [animation-delay:120ms]">
            Preserve the stories, photos, videos and voices of the people you've lost — safely, privately, and
            for every generation still to come.
          </p>
          <div className="mt-9 flex animate-fade-up flex-wrap gap-3 [animation-delay:220ms]">
            <Button asChild variant="hero" size="xl">
              <Link to="/auth" search={{ mode: "signup" }}>
                Begin a Memory Archive <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="glass" size="xl">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Formats */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="max-w-2xl">
          <p className="eyebrow">The Memory Archive</p>
          <h2 className="mt-4 text-4xl font-semibold md:text-5xl">One home for everything they left behind.</h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {formats.map(({ icon: Icon, title, text }) => (
            <div key={title} className="glass-panel group rounded-2xl p-6 transition-all hover:-translate-y-1 hover:border-primary/40">
              <div className="flex size-11 items-center justify-center rounded-xl bg-aurora text-primary-foreground">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-6 text-2xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Promise — white band */}
      <section className="bg-paper text-paper-foreground">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <p className="eyebrow">Our promise</p>
            <h2 className="mt-4 text-4xl font-semibold md:text-5xl">Guarded with the care their memory deserves.</h2>
            <p className="mt-5 max-w-md text-paper-muted">
              Your archive lives in secure, private storage. Media is only ever shown through short-lived, protected
              links — never left open on the internet.
            </p>
          </div>
          <ul className="space-y-6">
            {promises.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-paper-foreground text-primary">
                  <Icon className="size-5" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-paper-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <p className="eyebrow">How it works</p>
        <div className="mt-10 grid gap-10 md:grid-cols-3">
          {[
            ["01", "Create your account", "Join LifeEcho in under a minute with email, Google or Lovable."],
            ["02", "Open a memorial", "Add their name, dates, a few words and a portrait to begin."],
            ["03", "Gather the memories", "Add stories, photos, videos and audio — alone or as a family."],
          ].map(([n, t, d]) => (
            <div key={n} className="border-t border-border pt-6">
              <span className="font-display text-5xl text-aurora">{n}</span>
              <h3 className="mt-4 text-2xl font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
        <div className="glass-panel relative mt-24 overflow-hidden rounded-3xl px-6 py-16 text-center md:px-16">
          <Particles />
          <h2 className="relative text-4xl font-semibold md:text-5xl">Their story isn't over while it's still told.</h2>
          <Button asChild variant="hero" size="xl" className="relative mt-8">
            <Link to="/auth" search={{ mode: "signup" }}>
              Start preserving today
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
