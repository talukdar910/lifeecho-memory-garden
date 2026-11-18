import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const input = z.object({ id: z.string().uuid() });

/** Public, read-only: returns a memorial only when its owner has made it public. */
export const getPublicMemorial = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (req, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(req, { ...init, headers: h });
        },
      },
    });
    const { data: memorial } = await client
      .from("memorials")
      .select("id, full_name, birth_date, death_date, birthplace, epitaph, biography, cover_path, visibility")
      .eq("id", data.id)
      .eq("visibility", "public")
      .maybeSingle();
    if (!memorial) return null;
    const { data: memories } = await client
      .from("memories")
      .select("id, kind, title, body, media_path, memory_date, created_at")
      .eq("memorial_id", data.id)
      .order("memory_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    return { memorial, memories: memories ?? [] };
  });
