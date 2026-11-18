import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { requireUserId, uploadMedia } from "@/lib/archive";
import { newMemorialPayload } from "@/lib/memory-rules";
import { MemorialForm } from "@/components/lifeecho/memorial-form";

export const Route = createFileRoute("/_authenticated/archive/new")({
  head: () => ({
    meta: [
      { title: "New memorial — LifeEcho" },
      { name: "description", content: "Open a new memorial in your LifeEcho Memory Archive." },
      { property: "og:title", content: "New memorial — LifeEcho" },
      { property: "og:description", content: "Open a new memorial in your LifeEcho Memory Archive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewMemorial,
});

function NewMemorial() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <Link to="/archive" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Memory Archive
      </Link>
      <h1 className="mt-4 text-4xl font-semibold md:text-5xl">Open a memorial</h1>
      <p className="mt-2 text-muted-foreground">Start with the essentials — you can add memories right after.</p>
      <div className="glass-panel mt-8 rounded-3xl p-6 md:p-8">
        <MemorialForm
          submitLabel="Create memorial"
          onSubmit={async (values, cover) => {
            const uid = await requireUserId();
            const { data, error } = await supabase.from("memorials").insert(newMemorialPayload(values, uid)).select("id").single();
            if (error) throw error;
            if (cover) {
              const path = await uploadMedia(cover, data.id);
              await supabase.from("memorials").update({ cover_path: path }).eq("id", data.id);
            }
            await qc.invalidateQueries({ queryKey: ["memorials"] });
            toast.success("Memorial created.");
            navigate({ to: "/archive/$memorialId", params: { memorialId: data.id } });
          }}
        />
      </div>
    </div>
  );
}
