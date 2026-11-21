import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A member's public page: only their name/photo basics and memories marked Public. */
export const getPublicEcho = createServerFn({ method: "GET" })
  .inputValidator((input: { memberId: string }) => {
    if (!UUID.test(input.memberId)) throw new Error("Invalid member");
    return input;
  })
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: rows, error } = await sb.rpc("public_member", { _id: data.memberId });
    if (error) throw new Error(error.message);
    const member = rows?.[0] ?? null;
    if (!member) return { member: null, memories: [] };
    const { data: memories, error: mErr } = await sb
      .from("life_memories")
      .select("id, kind, title, body, media_path, memory_date, created_at, emotion, privacy")
      .eq("owner_id", data.memberId)
      .eq("privacy", "public")
      .order("memory_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (mErr) throw new Error(mErr.message);
    return { member, memories: memories ?? [] };
  });
