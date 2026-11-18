import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { fileExtension } from "./memory-rules";

export type Memorial = Tables<"memorials">;
export type Memory = Tables<"memories">;
export type Profile = Tables<"profiles">;

export const MEDIA_BUCKET = "memories";

export async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Please sign in again.");
  return data.user.id;
}

export const profileQuery = () =>
  queryOptions({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Please sign in again.");
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return { profile: data, email: user.email ?? "", createdAt: user.created_at };
    },
  });

export const memorialsQuery = () =>
  queryOptions({
    queryKey: ["memorials"],
    queryFn: async () => {
      const uid = await requireUserId();
      const { data, error } = await supabase
        .from("memorials")
        .select("*, memories(count)")
        .eq("owner_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((m) => ({
        ...m,
        memoryCount: (m.memories as unknown as { count: number }[])[0]?.count ?? 0,
      }));
    },
  });

export const archiveStatsQuery = () =>
  queryOptions({
    queryKey: ["archive-stats"],
    queryFn: async () => {
      const uid = await requireUserId();
      const { data, error } = await supabase.from("memories").select("kind").eq("owner_id", uid);
      if (error) throw error;
      const counts = { story: 0, photo: 0, video: 0, audio: 0 } as Record<string, number>;
      data.forEach((r) => {
        counts[r.kind] = (counts[r.kind] ?? 0) + 1;
      });
      return counts;
    },
  });

export const memorialDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["memorial", id],
    queryFn: async () => {
      const [{ data: memorial, error }, { data: memories, error: mErr }] = await Promise.all([
        supabase.from("memorials").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("memories")
          .select("*")
          .eq("memorial_id", id)
          .order("memory_date", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
      ]);
      if (error) throw error;
      if (mErr) throw mErr;
      return { memorial, memories: memories ?? [] };
    },
  });

/** Uploads a file into the member's private folder for a memorial and returns its storage path. */
export async function uploadMedia(file: File, folder: string): Promise<string> {
  const uid = await requireUserId();
  const path = `${uid}/${folder}/${crypto.randomUUID()}.${fileExtension(file.name)}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  return path;
}

export async function removeMedia(paths: (string | null | undefined)[]) {
  const clean = paths.filter((p): p is string => !!p);
  if (clean.length) await supabase.storage.from(MEDIA_BUCKET).remove(clean);
}

/** Short-lived links to private media. External URLs (e.g. Google avatars) pass through. */
export function useMediaUrls(paths: (string | null | undefined)[]) {
  const unique = Array.from(new Set(paths.filter((p): p is string => !!p))).sort();
  const storagePaths = unique.filter((p) => !/^https?:\/\//.test(p));
  return useQuery({
    queryKey: ["media-urls", storagePaths],
    enabled: unique.length > 0,
    staleTime: 45 * 60 * 1000,
    queryFn: async () => {
      const map: Record<string, string> = {};
      unique.filter((p) => /^https?:\/\//.test(p)).forEach((p) => (map[p] = p));
      if (storagePaths.length) {
        const { data, error } = await supabase.storage
          .from(MEDIA_BUCKET)
          .createSignedUrls(storagePaths, 60 * 60);
        if (error) throw error;
        data.forEach((d) => {
          if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
        });
      }
      return map;
    },
  });
}
