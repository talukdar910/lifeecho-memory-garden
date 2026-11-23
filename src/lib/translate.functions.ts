import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { languageName } from "@/lib/locales";
import { isSupportedLanguage, isTranslationFresh } from "@/lib/memory-rules";

/** Translates a memory the signed-in reader is allowed to see; results are saved and reused. */
export const translateMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { memoryId: string; language: string }) => {
    if (typeof input?.memoryId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.memoryId)) throw new Error("Invalid memory");
    if (!isSupportedLanguage(input.language)) throw new Error("Unsupported language");
    return { memoryId: input.memoryId, language: input.language };
  })
  .handler(async ({ data, context }) => {
    // RLS decides whether this reader may see the memory at all.
    const { data: memory, error } = await context.supabase
      .from("life_memories")
      .select("id, title, body, updated_at")
      .eq("id", data.memoryId)
      .maybeSingle();
    if (error) throw new Error("Could not load this memory.");
    if (!memory) throw new Error("Memory not found.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cached } = await supabaseAdmin
      .from("memory_translations")
      .select("title, body, source_updated_at")
      .eq("memory_id", memory.id)
      .eq("language", data.language)
      .maybeSingle();
    if (cached && isTranslationFresh(memory.updated_at, cached.source_updated_at)) {
      return { title: cached.title, body: cached.body, language: data.language, cached: true };
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI translation isn't set up yet.");
    const { translateMemoryText } = await import("@/lib/ai/translate.server");
    const out = await translateMemoryText(apiKey, {
      title: memory.title,
      body: memory.body,
      languageName: languageName(data.language),
    });
    await supabaseAdmin.from("memory_translations").upsert({
      memory_id: memory.id,
      language: data.language,
      title: out.title,
      body: out.body,
      source_updated_at: memory.updated_at,
    });
    return { ...out, language: data.language, cached: false };
  });
