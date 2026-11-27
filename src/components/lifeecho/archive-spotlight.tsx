import { Link } from "@tanstack/react-router";
import { ArrowRight, Landmark, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import marble from "@/assets/memorial-marble.asset.json";

export function ArchiveSpotlight() {
  return (
    <section className="memorial relative isolate overflow-hidden border-y border-memorial-line">
      <img src={marble.url} alt="" className="absolute inset-0 -z-10 size-full object-cover opacity-35" />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:justify-between md:py-10">
        <div className="max-w-xl">
          <p className="flex items-center gap-2 text-sm text-memorial-gold"><Sprout className="size-4" /> Every life leaves an echo</p>
          <h2 className="mt-2 text-4xl font-medium md:text-5xl">The Memory Archive</h2>
          <p className="mt-2 text-lg text-memorial-muted">Lives remembered. Stories that stay with us.</p>
        </div>
        <Button asChild variant="outline" size="lg" className="shrink-0 border-memorial-gold/50 bg-memorial/70 text-memorial-gold hover:bg-memorial-gold/10 hover:text-memorial-foreground">
          <Link to="/archive"><Landmark /> Enter the Archive <ArrowRight /></Link>
        </Button>
      </div>
    </section>
  );
}