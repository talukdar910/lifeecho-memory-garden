ALTER TABLE public.life_memories DROP CONSTRAINT IF EXISTS life_memories_privacy_check;
ALTER TABLE public.life_memories ADD CONSTRAINT life_memories_privacy_check CHECK (privacy IN ('private', 'legacy', 'public'));

CREATE TABLE public.legacy_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  contact_email text NOT NULL CHECK (contact_email = lower(btrim(contact_email)) AND contact_email <> ''),
  contact_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, contact_email)
);
GRANT SELECT, INSERT, DELETE ON public.legacy_contacts TO authenticated;
GRANT ALL ON public.legacy_contacts TO service_role;
ALTER TABLE public.legacy_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their legacy contacts" ON public.legacy_contacts
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Admins view legacy contacts" ON public.legacy_contacts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Active owners add legacy contacts" ON public.legacy_contacts
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND public.is_active_member(auth.uid()));
CREATE POLICY "Active owners remove legacy contacts" ON public.legacy_contacts
  FOR DELETE TO authenticated USING (owner_id = auth.uid() AND public.is_active_member(auth.uid()));

CREATE OR REPLACE FUNCTION public.is_legacy_contact(_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.legacy_contacts c
    WHERE c.owner_id = _owner
      AND c.contact_email = (SELECT lower(u.email) FROM auth.users u WHERE u.id = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.is_verified_archived(_person uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.archive_entries a WHERE a.person_id = _person AND a.published)
$$;

DROP POLICY IF EXISTS "Members view legacy memories of archived profiles" ON public.life_memories;
CREATE POLICY "Legacy contacts view legacy memories after verified passing" ON public.life_memories
  FOR SELECT TO authenticated
  USING (privacy = 'legacy' AND hidden = false AND public.is_verified_archived(owner_id) AND public.is_legacy_contact(owner_id));
CREATE POLICY "Anyone views public memories" ON public.life_memories
  FOR SELECT TO anon, authenticated
  USING (privacy = 'public' AND hidden = false);

CREATE OR REPLACE FUNCTION public.has_public_memories(_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.life_memories m WHERE m.owner_id = _owner AND m.privacy = 'public' AND NOT m.hidden)
$$;

CREATE OR REPLACE FUNCTION public.can_view_media(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
      SELECT 1 FROM public.life_memories m
      WHERE m.media_path = _path AND NOT m.hidden
        AND (m.privacy = 'public'
             OR (m.privacy = 'legacy' AND public.is_verified_archived(m.owner_id) AND public.is_legacy_contact(m.owner_id)))
    )
    OR (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.archive_entries a WHERE a.avatar_path = _path AND a.published))
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.avatar_url = _path AND public.has_public_memories(p.id))
$$;

DROP POLICY IF EXISTS "Members read archived legacy media" ON storage.objects;
CREATE POLICY "Viewers read shared memory media" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'memories' AND public.can_view_media(name));

CREATE OR REPLACE FUNCTION public.public_member(_id uuid)
RETURNS TABLE (id uuid, full_name text, country text, avatar_path text, status text, bio text, member_since timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, COALESCE(p.full_name, p.display_name), p.country, p.avatar_url, p.status, p.bio, p.created_at
  FROM public.profiles p
  WHERE p.id = _id AND public.has_public_memories(p.id)
$$;
GRANT EXECUTE ON FUNCTION public.public_member(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_legacy_contact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_verified_archived(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_public_memories(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_media(text) TO anon, authenticated;

UPDATE public.life_memories SET privacy = 'public'
WHERE privacy = 'legacy' AND owner_id IN (SELECT person_id FROM public.archive_entries WHERE is_demo);