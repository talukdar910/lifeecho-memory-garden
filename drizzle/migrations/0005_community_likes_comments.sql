CREATE TABLE public.memory_likes (
  memory_id UUID NOT NULL REFERENCES public.life_memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (memory_id, user_id)
);
CREATE TABLE public.memory_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.life_memories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL DEFAULT auth.uid(),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX memory_comments_memory_idx ON public.memory_comments(memory_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.memory_likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.memory_comments TO authenticated;
GRANT ALL ON public.memory_likes TO service_role;
GRANT ALL ON public.memory_comments TO service_role;

CREATE OR REPLACE FUNCTION public.is_public_memory(_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.life_memories WHERE id = _id AND privacy = 'public' AND hidden = false)
$$;

ALTER TABLE public.memory_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see likes on public memories" ON public.memory_likes FOR SELECT TO authenticated USING (public.is_public_memory(memory_id));
CREATE POLICY "Members like public memories" ON public.memory_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_public_memory(memory_id) AND public.is_active_member(auth.uid()));
CREATE POLICY "Members remove own likes" ON public.memory_likes FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Members read comments on public memories" ON public.memory_comments FOR SELECT TO authenticated USING (public.is_public_memory(memory_id));
CREATE POLICY "Members comment on public memories" ON public.memory_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_public_memory(memory_id) AND public.is_active_member(auth.uid()));
CREATE POLICY "Authors or admins delete comments" ON public.memory_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Feed of Public memories from living members, with author basics and engagement counts.
CREATE OR REPLACE FUNCTION public.community_feed(_limit INT DEFAULT 30, _before TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (id UUID, owner_id UUID, kind TEXT, title TEXT, body TEXT, media_path TEXT, memory_date DATE, emotion TEXT,
  created_at TIMESTAMPTZ, author_name TEXT, author_avatar TEXT, author_country TEXT, like_count BIGINT, comment_count BIGINT, liked_by_me BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.owner_id, m.kind, m.title, m.body, m.media_path, m.memory_date, m.emotion, m.created_at,
    COALESCE(p.full_name, p.display_name), p.avatar_url, p.country,
    (SELECT count(*) FROM public.memory_likes l WHERE l.memory_id = m.id),
    (SELECT count(*) FROM public.memory_comments c WHERE c.memory_id = m.id),
    EXISTS (SELECT 1 FROM public.memory_likes l WHERE l.memory_id = m.id AND l.user_id = auth.uid())
  FROM public.life_memories m JOIN public.profiles p ON p.id = m.owner_id
  WHERE auth.uid() IS NOT NULL AND m.privacy = 'public' AND m.hidden = false
    AND NOT EXISTS (SELECT 1 FROM public.archive_entries a WHERE a.person_id = m.owner_id)
    AND (_before IS NULL OR m.created_at < _before)
  ORDER BY m.created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 50)
$$;

CREATE OR REPLACE FUNCTION public.memory_comment_list(_memory UUID)
RETURNS TABLE (id UUID, author_id UUID, author_name TEXT, author_avatar TEXT, body TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.author_id, COALESCE(p.full_name, p.display_name), p.avatar_url, c.body, c.created_at
  FROM public.memory_comments c LEFT JOIN public.profiles p ON p.id = c.author_id
  WHERE auth.uid() IS NOT NULL AND c.memory_id = _memory AND public.is_public_memory(_memory)
  ORDER BY c.created_at ASC
$$;
REVOKE EXECUTE ON FUNCTION public.community_feed(INT, TIMESTAMPTZ) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.memory_comment_list(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.community_feed(INT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.memory_comment_list(UUID) TO authenticated;