import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import { Heart, Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MemoryCard } from "@/components/lifeecho/memory-card";
import { supabase } from "@/integrations/supabase/client";
import { ensureCompleteProfile, profileQuery, useMediaUrls } from "@/lib/archive";
import { countryName } from "@/lib/locales";
import { MAX_COMMENT_LENGTH, validateComment } from "@/lib/memory-rules";

const feedQuery = () =>
  queryOptions({
    queryKey: ["community-feed"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("community_feed", { _limit: 40 });
      if (error) throw error;
      return data ?? [];
    },
  });

const commentsQuery = (memoryId: string) =>
  queryOptions({
    queryKey: ["comments", memoryId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("memory_comment_list", { _memory: memoryId });
      if (error) throw error;
      return data ?? [];
    },
  });

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({
    meta: [
      { title: "Community — LifeEcho" },
      { name: "description", content: "Discover, like and comment on the public memories LifeEcho members share." },
      { property: "og:title", content: "Community — LifeEcho" },
      { property: "og:description", content: "Stories, photos and voices shared openly by LifeEcho members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    await ensureCompleteProfile(context.queryClient);
    await context.queryClient.ensureQueryData(feedQuery());
  },
  component: CommunityPage,
});

function Avatar({ url, name }: { url?: string | undefined; name: string | null }) {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-semibold">
      {url ? <img src={url} alt="" className="size-full object-cover" /> : (name ?? "?").charAt(0)}
    </div>
  );
}

function CommunityPage() {
  const { data: posts } = useSuspenseQuery(feedQuery());
  const { data: urls } = useMediaUrls(posts.flatMap((p) => [p.media_path, p.author_avatar]));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="eyebrow">Community</p>
      <h1 className="mt-3 text-4xl font-semibold md:text-5xl">Shared lives</h1>
      <p className="mt-3 text-muted-foreground">
        Memories members chose to share with everyone. Mark any of yours as Public on your dashboard to join in.
      </p>
      {posts.length === 0 ? (
        <div className="glass-panel mt-10 rounded-2xl p-8 text-center">
          <p className="text-muted-foreground">Nothing shared yet. Be the first to post a Public memory.</p>
          <Button asChild variant="hero" className="mt-5 rounded-full">
            <Link to="/dashboard">Share a memory</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-6">
          {posts.map((p) => (
            <article key={p.id} className="grid gap-3">
              <Link to="/echo/$memberId" params={{ memberId: p.owner_id }} className="flex min-w-0 items-center gap-3">
                <Avatar url={p.author_avatar ? urls?.[p.author_avatar] : undefined} name={p.author_name} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.author_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[countryName(p.author_country), formatDistanceToNow(new Date(p.created_at), { addSuffix: true })]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </Link>
              <MemoryCard memory={p} url={p.media_path ? urls?.[p.media_path] : undefined} reportable />
              <Engagement post={p} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

type Post = { id: string; like_count: number; comment_count: number; liked_by_me: boolean };

function Engagement({ post }: { post: Post }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const like = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please sign in again.");
      const res = post.liked_by_me
        ? await supabase.from("memory_likes").delete().eq("memory_id", post.id).eq("user_id", auth.user.id)
        : await supabase.from("memory_likes").insert({ memory_id: post.id, user_id: auth.user.id });
      if (res.error) throw res.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community-feed"] }),
    onError: (e) => toast.error(e.message),
  });
  return (
    <div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => like.mutate()} disabled={like.isPending} aria-pressed={post.liked_by_me}>
          <Heart className={post.liked_by_me ? "fill-primary text-primary" : ""} /> {post.like_count}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <MessageCircle /> {post.comment_count}
        </Button>
      </div>
      {open && <Comments memoryId={post.id} />}
    </div>
  );
}

function Comments({ memoryId }: { memoryId: string }) {
  const qc = useQueryClient();
  const { data: me } = useQuery(profileQuery());
  const { data: comments, isLoading } = useQuery(commentsQuery(memoryId));
  const { data: urls } = useMediaUrls((comments ?? []).map((c) => c.author_avatar));
  const [body, setBody] = useState("");
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["comments", memoryId] });
    qc.invalidateQueries({ queryKey: ["community-feed"] });
  };
  const add = useMutation({
    mutationFn: async () => {
      const invalid = validateComment(body);
      if (invalid) throw new Error(invalid);
      const { error } = await supabase.from("memory_comments").insert({ memory_id: memoryId, body: body.trim(), author_id: me!.userId });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("memory_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    add.mutate();
  }
  return (
    <div className="mt-2 grid gap-3 rounded-2xl border border-border p-4">
      {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      {comments?.map((c) => (
        <div key={c.id} className="flex gap-3">
          <Avatar url={c.author_avatar ? urls?.[c.author_avatar] : undefined} name={c.author_name} />
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-semibold">{c.author_name}</span>{" "}
              <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
            </p>
            <p className="text-sm break-words whitespace-pre-line text-foreground/90">{c.body}</p>
          </div>
          {me?.userId === c.author_id && (
            <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Delete comment" onClick={() => remove.mutate(c.id)}>
              <Trash2 />
            </Button>
          )}
        </div>
      ))}
      <form onSubmit={submit} className="flex items-end gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder="Write a kind comment…"
          rows={1}
          className="min-h-10 resize-none"
          aria-label="Comment"
        />
        <Button type="submit" size="icon" variant="hero" disabled={add.isPending} aria-label="Post comment">
          {add.isPending ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </form>
    </div>
  );
}
