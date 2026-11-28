CREATE TABLE public.archive_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_entry_id uuid NOT NULL REFERENCES public.archive_entries(id),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL CHECK (kind IN ('story','experience','thought','photo','video','audio')),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  body text,
  media_path text,
  memory_date date,
  emotion text,
  privacy text NOT NULL DEFAULT 'private' CHECK (privacy IN ('private','public')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT archive_memory_media_owner CHECK (media_path IS NULL OR media_path LIKE owner_id::text || '/memories/%')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.archive_memories TO authenticated;
GRANT ALL ON public.archive_memories TO service_role;
ALTER TABLE public.archive_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contributors read their own memorial memories" ON public.archive_memories FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Members read shared contributions on published memorials" ON public.archive_memories FOR SELECT TO authenticated USING (privacy = 'public' AND EXISTS (SELECT 1 FROM public.archive_entries a WHERE a.id = archive_entry_id AND a.published));
CREATE POLICY "Active members contribute to published memorials" ON public.archive_memories FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND public.is_active_member(auth.uid()) AND EXISTS (SELECT 1 FROM public.archive_entries a WHERE a.id = archive_entry_id AND a.published));
CREATE POLICY "Contributors update their own memorial memories" ON public.archive_memories FOR UPDATE TO authenticated USING (owner_id = auth.uid() AND public.is_active_member(auth.uid())) WITH CHECK (owner_id = auth.uid() AND public.is_active_member(auth.uid()));
CREATE POLICY "Contributors delete their own memorial memories" ON public.archive_memories FOR DELETE TO authenticated USING (owner_id = auth.uid() AND public.is_active_member(auth.uid()));
CREATE INDEX archive_memories_timeline ON public.archive_memories (archive_entry_id, memory_date, created_at);
CREATE OR REPLACE FUNCTION public.guard_archive_memory_update() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.archive_entry_id IS DISTINCT FROM OLD.archive_entry_id THEN
    RAISE EXCEPTION 'A contribution cannot change owner or memorial';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_archive_memory_update BEFORE UPDATE ON public.archive_memories FOR EACH ROW EXECUTE FUNCTION public.guard_archive_memory_update();
CREATE TRIGGER archive_memories_updated BEFORE UPDATE ON public.archive_memories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE OR REPLACE FUNCTION public.can_view_media(_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.life_memories m WHERE m.media_path = _path AND NOT m.hidden
    AND (m.privacy = 'public' OR (m.privacy = 'legacy' AND public.is_verified_archived(m.owner_id) AND public.is_legacy_contact(m.owner_id)))
  )
  OR (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.archive_entries a WHERE a.avatar_path = _path AND a.published))
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.avatar_url = _path AND public.has_public_memories(p.id))
  OR (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.archive_memories m JOIN public.archive_entries a ON a.id = m.archive_entry_id
    WHERE m.media_path = _path AND (m.owner_id = auth.uid() OR (m.privacy = 'public' AND a.published))
  ));
$$;