-- ===== Roles =====
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ===== Profiles =====
ALTER TABLE public.profiles
  ADD COLUMN full_name TEXT,
  ADD COLUMN email TEXT,
  ADD COLUMN date_of_birth DATE,
  ADD COLUMN preferred_language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN date_of_death DATE,
  ADD COLUMN archived_at TIMESTAMPTZ;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'inactive', 'deceased'));

UPDATE public.profiles p SET email = u.email, full_name = COALESCE(p.display_name, split_part(u.email, '@', 1))
FROM auth.users u WHERE u.id = p.id;

CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_active_member(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND status <> 'deceased')
$$;

CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF OLD.status = 'deceased' THEN
      RAISE EXCEPTION 'This profile is in the Memory Archive and can no longer be changed';
    END IF;
    NEW.status := OLD.status;
    NEW.date_of_death := OLD.date_of_death;
    NEW.archived_at := OLD.archived_at;
    NEW.email := OLD.email;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER profiles_guard BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _dob DATE;
  _name TEXT := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
BEGIN
  BEGIN
    _dob := NULLIF(NEW.raw_user_meta_data->>'date_of_birth', '')::date;
  EXCEPTION WHEN others THEN _dob := NULL;
  END;
  INSERT INTO public.profiles (id, display_name, full_name, email, avatar_url, date_of_birth, country)
  VALUES (NEW.id, _name, _name, NEW.email, NEW.raw_user_meta_data->>'avatar_url', _dob, NULLIF(NEW.raw_user_meta_data->>'country', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

-- ===== Archive =====
CREATE SEQUENCE public.archive_profile_number_seq START 1;
CREATE TABLE public.archive_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_number INTEGER NOT NULL UNIQUE DEFAULT nextval('public.archive_profile_number_seq'),
  person_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  date_of_death DATE,
  country TEXT,
  avatar_path TEXT,
  biography TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT true,
  death_report_id UUID,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.archive_entries TO authenticated;
GRANT ALL ON public.archive_entries TO service_role;
ALTER TABLE public.archive_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members browse published archive" ON public.archive_entries FOR SELECT TO authenticated
  USING (published OR public.has_role(auth.uid(), 'admin'));

-- ===== Personal memories =====
CREATE TABLE public.life_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('story', 'experience', 'thought', 'photo', 'video', 'audio')),
  title TEXT NOT NULL,
  body TEXT,
  media_path TEXT,
  memory_date DATE,
  emotion TEXT,
  privacy TEXT NOT NULL DEFAULT 'private' CHECK (privacy IN ('private', 'legacy')),
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX life_memories_owner_idx ON public.life_memories(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.life_memories TO authenticated;
GRANT ALL ON public.life_memories TO service_role;
ALTER TABLE public.life_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own memories" ON public.life_memories FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Active owners add memories" ON public.life_memories FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.is_active_member(auth.uid()));
CREATE POLICY "Active owners edit memories" ON public.life_memories FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND public.is_active_member(auth.uid()))
  WITH CHECK (owner_id = auth.uid() AND public.is_active_member(auth.uid()));
CREATE POLICY "Active owners delete memories" ON public.life_memories FOR DELETE TO authenticated
  USING (owner_id = auth.uid() AND public.is_active_member(auth.uid()));
CREATE POLICY "Members view legacy memories of archived profiles" ON public.life_memories FOR SELECT TO authenticated
  USING (privacy = 'legacy' AND hidden = false AND EXISTS (SELECT 1 FROM public.archive_entries a WHERE a.person_id = owner_id AND a.published));
CREATE POLICY "Admins view all memories" ON public.life_memories FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.guard_memory_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.hidden := OLD.hidden;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
CREATE TRIGGER life_memories_guard BEFORE UPDATE ON public.life_memories FOR EACH ROW EXECUTE FUNCTION public.guard_memory_update();

-- ===== Death verification =====
CREATE TABLE public.death_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  subject_email TEXT NOT NULL,
  subject_full_name TEXT NOT NULL,
  subject_id UUID,
  date_of_death DATE NOT NULL,
  relationship TEXT,
  proof_path TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.death_reports TO authenticated;
GRANT ALL ON public.death_reports TO service_role;
ALTER TABLE public.death_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read death reports" ON public.death_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ===== Content reports =====
CREATE TABLE public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.life_memories(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'actioned')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read content reports" ON public.content_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ===== Security log =====
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  action TEXT NOT NULL,
  target TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ===== Actions (RPC) =====
CREATE OR REPLACE FUNCTION public.submit_death_report(_email TEXT, _full_name TEXT, _date_of_death DATE, _relationship TEXT, _proof_path TEXT, _notes TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id UUID; _subject UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  IF _proof_path IS NULL OR split_part(_proof_path, '/', 1) <> auth.uid()::text THEN
    RAISE EXCEPTION 'A proof document is required';
  END IF;
  IF _date_of_death IS NULL OR _date_of_death > current_date THEN RAISE EXCEPTION 'Please enter a valid date of passing'; END IF;
  SELECT id INTO _subject FROM public.profiles WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  INSERT INTO public.death_reports (reporter_id, subject_email, subject_full_name, subject_id, date_of_death, relationship, proof_path, notes)
  VALUES (auth.uid(), lower(trim(_email)), trim(_full_name), _subject, _date_of_death, _relationship, _proof_path, _notes)
  RETURNING id INTO _id;
  INSERT INTO public.audit_log (actor_id, action, target) VALUES (auth.uid(), 'death_report.submitted', _id::text);
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.my_death_reports()
RETURNS TABLE (id UUID, subject_full_name TEXT, date_of_death DATE, status TEXT, review_note TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, subject_full_name, date_of_death, status, review_note, created_at
  FROM public.death_reports WHERE reporter_id = auth.uid() ORDER BY created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.review_death_report(_report_id UUID, _approve BOOLEAN, _note TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.death_reports%ROWTYPE; p public.profiles%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO r FROM public.death_reports WHERE id = _report_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Report not found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'This report was already reviewed'; END IF;
  IF _approve THEN
    IF r.subject_id IS NULL THEN RAISE EXCEPTION 'No LifeEcho account matches this email, so it cannot be approved'; END IF;
    SELECT * INTO p FROM public.profiles WHERE id = r.subject_id FOR UPDATE;
    IF p.status = 'deceased' THEN RAISE EXCEPTION 'This profile is already in the archive'; END IF;
    UPDATE public.profiles SET status = 'deceased', date_of_death = r.date_of_death, archived_at = now() WHERE id = p.id;
    INSERT INTO public.archive_entries (person_id, full_name, date_of_birth, date_of_death, country, avatar_path, biography, death_report_id)
    VALUES (p.id, COALESCE(p.full_name, p.display_name, r.subject_full_name), p.date_of_birth, r.date_of_death, p.country, p.avatar_url, p.bio, r.id);
    UPDATE public.death_reports SET status = 'approved', review_note = _note, reviewed_by = auth.uid(), reviewed_at = now() WHERE id = r.id;
    INSERT INTO public.audit_log (actor_id, action, target, details) VALUES (auth.uid(), 'death_report.approved', r.id::text, jsonb_build_object('profile', p.id));
  ELSE
    UPDATE public.death_reports SET status = 'rejected', review_note = _note, reviewed_by = auth.uid(), reviewed_at = now() WHERE id = r.id;
    INSERT INTO public.audit_log (actor_id, action, target) VALUES (auth.uid(), 'death_report.rejected', r.id::text);
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.report_memory(_memory_id UUID, _reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.life_memories m JOIN public.archive_entries a ON a.person_id = m.owner_id
                 WHERE m.id = _memory_id AND m.privacy = 'legacy' AND a.published) THEN
    RAISE EXCEPTION 'Memory not found';
  END IF;
  INSERT INTO public.content_reports (memory_id, reporter_id, reason) VALUES (_memory_id, auth.uid(), left(trim(_reason), 1000));
  INSERT INTO public.audit_log (actor_id, action, target) VALUES (auth.uid(), 'content.reported', _memory_id::text);
END; $$;

CREATE OR REPLACE FUNCTION public.resolve_content_report(_report_id UUID, _hide_memory BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _memory UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT memory_id INTO _memory FROM public.content_reports WHERE id = _report_id;
  IF _memory IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;
  IF _hide_memory THEN UPDATE public.life_memories SET hidden = true WHERE id = _memory; END IF;
  UPDATE public.content_reports SET status = CASE WHEN _hide_memory THEN 'actioned' ELSE 'dismissed' END,
    reviewed_by = auth.uid(), reviewed_at = now() WHERE id = _report_id;
  INSERT INTO public.audit_log (actor_id, action, target) VALUES (auth.uid(), CASE WHEN _hide_memory THEN 'content.hidden' ELSE 'content.report_dismissed' END, _memory::text);
END; $$;

CREATE OR REPLACE FUNCTION public.set_memory_hidden(_memory_id UUID, _hidden BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.life_memories SET hidden = _hidden WHERE id = _memory_id;
  INSERT INTO public.audit_log (actor_id, action, target) VALUES (auth.uid(), CASE WHEN _hidden THEN 'content.hidden' ELSE 'content.restored' END, _memory_id::text);
END; $$;

CREATE OR REPLACE FUNCTION public.set_archive_published(_entry_id UUID, _published BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.archive_entries SET published = _published WHERE id = _entry_id;
  INSERT INTO public.audit_log (actor_id, action, target) VALUES (auth.uid(), CASE WHEN _published THEN 'archive.published' ELSE 'archive.unpublished' END, _entry_id::text);
END; $$;

REVOKE EXECUTE ON FUNCTION public.submit_death_report(TEXT, TEXT, DATE, TEXT, TEXT, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.my_death_reports() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.review_death_report(UUID, BOOLEAN, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.report_memory(UUID, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.resolve_content_report(UUID, BOOLEAN) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_memory_hidden(UUID, BOOLEAN) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_archive_published(UUID, BOOLEAN) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.submit_death_report(TEXT, TEXT, DATE, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_death_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_death_report(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_memory(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_content_report(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_memory_hidden(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_archive_published(UUID, BOOLEAN) TO authenticated;

-- ===== Storage =====
DROP POLICY IF EXISTS "Visitors read public memorial media" ON storage.objects;
CREATE POLICY "Members read archived legacy media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'memories' AND (
    EXISTS (SELECT 1 FROM public.life_memories m JOIN public.archive_entries a ON a.person_id = m.owner_id
            WHERE m.media_path = storage.objects.name AND m.privacy = 'legacy' AND NOT m.hidden AND a.published)
    OR EXISTS (SELECT 1 FROM public.archive_entries a WHERE a.avatar_path = storage.objects.name AND a.published)
  ));
CREATE POLICY "Admins read all media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('memories', 'verification') AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Reporters upload proof" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'verification' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Reporters read own proof" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'verification' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ===== Retire memorials =====
COMMENT ON TABLE public.memorials IS 'DEPRECATED: replaced by archive_entries + life_memories';
COMMENT ON TABLE public.memories IS 'DEPRECATED: replaced by life_memories';

-- ===== Demo profiles (fictional) =====
INSERT INTO public.archive_entries (profile_number, person_id, full_name, date_of_birth, date_of_death, country, avatar_path, biography, is_demo, archived_at) VALUES
(1, '00000000-0000-4000-a000-000000000001', 'Amara Wanjiru Odhiambo', '1939-03-14', '2023-08-02', 'KE', '/images/demo/portrait-1.jpg',
 'A midwife in the highlands for forty-one years, Amara helped bring more than three thousand children into the world. She sang to every one of them.', true, '2023-09-10'),
(2, '00000000-0000-4000-a000-000000000002', 'Mateo Álvarez Rojas', '1946-11-02', '2022-05-19', 'CL', '/images/demo/portrait-2.jpg',
 'Fisherman, carpenter and storyteller from the coast near Valparaíso. He built three boats by hand and named each one after a granddaughter.', true, '2022-07-01'),
(3, '00000000-0000-4000-a000-000000000003', 'Ingrid Solberg', '1958-06-21', '2024-01-11', 'NO', '/images/demo/portrait-3.jpg',
 'Librarian, cross-country skier and tireless letter writer. Ingrid kept a diary every day for fifty years and left it to whoever might need it.', true, '2024-02-20');
SELECT setval('public.archive_profile_number_seq', 3, true);

INSERT INTO public.life_memories (owner_id, kind, title, body, memory_date, emotion, privacy, created_at) VALUES
('00000000-0000-4000-a000-000000000001', 'story', 'The night of the long rain', 'In 1968 the road washed out and I walked six hours to reach a mother in labour. When the baby cried at dawn, the rain stopped. Her family still calls her Mvua — rain.', '1968-04-22', 'pride', 'legacy', '2021-01-03'),
('00000000-0000-4000-a000-000000000001', 'thought', 'To my grandchildren', 'Be gentle with beginnings. Everything that matters starts small and frightened, just like you did.', NULL, 'love', 'legacy', '2022-06-12'),
('00000000-0000-4000-a000-000000000001', 'experience', 'My first salary', 'I bought my mother a radio. We listened to the news together every evening until she passed.', '1961-09-01', 'gratitude', 'legacy', '2021-03-15'),
('00000000-0000-4000-a000-000000000002', 'story', 'Building the Lucía', 'Her ribs are Chilean cypress. It took me two winters and a great deal of patience from my wife. She sailed for thirty years and never once leaked.', '1979-02-10', 'pride', 'legacy', '2020-10-01'),
('00000000-0000-4000-a000-000000000002', 'experience', 'The storm of 1987', 'We were caught nine miles out. I remember thinking only of my daughters'' faces. The sea let us go home that night — I never took it for granted again.', '1987-07-04', 'hope', 'legacy', '2020-11-21'),
('00000000-0000-4000-a000-000000000002', 'thought', 'On fixing things', 'Almost anything broken can be repaired with time, good wood and an honest apology.', NULL, 'nostalgia', 'legacy', '2021-05-30'),
('00000000-0000-4000-a000-000000000003', 'story', 'The library on wheels', 'In 1984 we turned an old bus into a library and drove it to the villages up north. Children would run beside it for a kilometre. Some of them became teachers.', '1984-05-14', 'joy', 'legacy', '2022-02-02'),
('00000000-0000-4000-a000-000000000003', 'thought', 'Why I wrote every day', 'Not because my life was remarkable, but because ordinary days are the ones we forget first. Read them and know we were here.', NULL, 'love', 'legacy', '2023-03-08'),
('00000000-0000-4000-a000-000000000003', 'experience', 'Birkebeiner, 1996', 'Fifty-four kilometres on skis, a six-kilogram pack, and my sister cheering at the finish with cold coffee. Best coffee of my life.', '1996-03-16', 'joy', 'legacy', '2022-12-24');