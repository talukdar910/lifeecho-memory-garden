import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { fileExtension } from "./memory-rules";

export type Profile = Tables<"profiles">;
export type LifeMemory = Tables<"life_memories">;
export type ArchiveEntry = Tables<"archive_entries">;

export const MEDIA_BUCKET = "memories";
export const PROOF_BUCKET = "verification";

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
      return { profile: data, email: user.email ?? "", createdAt: user.created_at, userId: user.id };
    },
  });

export const isAdminQuery = () =>
  queryOptions({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: auth.user.id, _role: "admin" });
      return data === true;
    },
  });

export const myMemoriesQuery = () =>
  queryOptions({
    queryKey: ["my-memories"],
    queryFn: async () => {
      const uid = await requireUserId();
      const { data, error } = await supabase
        .from("life_memories")
        .select("*")
        .eq("owner_id", uid)
        .order("memory_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const archiveListQuery = () =>
  queryOptions({
    queryKey: ["archive"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("archive_entries")
        .select("*")
        .eq("published", true)
        .order("profile_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

export const archiveEntryQuery = (profileNumber: number) =>
  queryOptions({
    queryKey: ["archive", profileNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("archive_entries")
        .select("*")
        .eq("profile_number", profileNumber)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const legacyMemoriesQuery = (personId: string) =>
  queryOptions({
    queryKey: ["legacy-memories", personId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("life_memories")
        .select("*")
        .eq("owner_id", personId)
        .eq("privacy", "legacy")
        .eq("hidden", false)
        .order("memory_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

/** Uploads into the member's own folder and returns the storage path. */
export async function uploadFile(file: File, folder: string, bucket = MEDIA_BUCKET): Promise<string> {
  const uid = await requireUserId();
  const path = `${uid}/${folder}/${crypto.randomUUID()}.${fileExtension(file.name)}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  return path;
}

export async function removeMedia(paths: (string | null | undefined)[]) {
  const clean = paths.filter((p): p is string => !!p && !isDirectUrl(p));
  if (clean.length) await supabase.storage.from(MEDIA_BUCKET).remove(clean);
}

function isDirectUrl(p: string) {
  return /^https?:\/\//.test(p) || p.startsWith("/");
}

/** Short-lived links to private media. Web links and bundled demo images pass through unchanged. */
export function useMediaUrls(paths: (string | null | undefined)[], bucket = MEDIA_BUCKET) {
  const unique = Array.from(new Set(paths.filter((p): p is string => !!p))).sort();
  const storagePaths = unique.filter((p) => !isDirectUrl(p));
  return useQuery({
    queryKey: ["media-urls", bucket, unique],
    enabled: unique.length > 0,
    staleTime: 45 * 60 * 1000,
    queryFn: async () => {
      const map: Record<string, string> = {};
      unique.filter(isDirectUrl).forEach((p) => (map[p] = p));
      if (storagePaths.length) {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrls(storagePaths, 60 * 60);
        if (error) throw error;
        data.forEach((d) => {
          if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
        });
      }
      return map;
    },
  });
}
