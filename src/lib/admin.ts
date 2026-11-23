import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Every query here relies on the admin-only RLS policies; non-admins get empty results.

async function count(table: "profiles" | "life_memories" | "archive_entries", filter?: (q: any) => any) {
  let q = supabase.from(table).select("id", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count: n, error } = await q;
  if (error) throw error;
  return n ?? 0;
}

export const adminStatsQuery = () =>
  queryOptions({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const [members, archived, memories, publicMemories, hiddenMemories, archive, pendingDeaths, openReports] =
        await Promise.all([
          count("profiles"),
          count("profiles", (q) => q.eq("status", "deceased")),
          count("life_memories"),
          count("life_memories", (q) => q.eq("privacy", "public")),
          count("life_memories", (q) => q.eq("hidden", true)),
          count("archive_entries"),
          supabase.from("death_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("content_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
        ]);
      return {
        members,
        active: members - archived,
        archived,
        memories,
        publicMemories,
        hiddenMemories,
        archive,
        pendingDeaths: pendingDeaths.count ?? 0,
        openReports: openReports.count ?? 0,
      };
    },
  });

export const adminMembersQuery = () =>
  queryOptions({
    queryKey: ["admin", "members"],
    queryFn: async () => {
      const [{ data: members, error }, { data: roles, error: rolesError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, display_name, email, country, status, created_at, last_active_at, avatar_url")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
      ]);
      if (error) throw error;
      if (rolesError) throw rolesError;
      const admins = new Set((roles ?? []).map((r) => r.user_id));
      return (members ?? []).map((m) => ({ ...m, isAdmin: admins.has(m.id) }));
    },
  });

export const adminArchiveQuery = () =>
  queryOptions({
    queryKey: ["admin", "archive"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("archive_entries")
        .select("*")
        .order("profile_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

async function namesFor(ids: (string | null)[]) {
  const unique = Array.from(new Set(ids.filter((x): x is string => !!x)));
  if (!unique.length) return {} as Record<string, string>;
  const { data } = await supabase.from("profiles").select("id, full_name, display_name, email").in("id", unique);
  const map: Record<string, string> = {};
  (data ?? []).forEach((p) => (map[p.id] = p.full_name || p.display_name || p.email || "Member"));
  return map;
}

export const adminContentReportsQuery = () =>
  queryOptions({
    queryKey: ["admin", "content-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_reports")
        .select("*, life_memories(id, title, body, kind, privacy, hidden, owner_id)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const names = await namesFor(data.flatMap((r) => [r.reporter_id, r.life_memories?.owner_id ?? null]));
      return data.map((r) => ({
        ...r,
        reporterName: names[r.reporter_id] ?? "Member",
        ownerName: r.life_memories ? (names[r.life_memories.owner_id] ?? "Member") : "—",
      }));
    },
  });

export const auditLogQuery = () =>
  queryOptions({
    queryKey: ["admin", "audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      const names = await namesFor(data.map((r) => r.actor_id));
      return data.map((r) => ({ ...r, actorName: r.actor_id ? (names[r.actor_id] ?? "Member") : "System" }));
    },
  });
