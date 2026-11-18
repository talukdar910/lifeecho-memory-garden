CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  country TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Members update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.memorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  birth_date DATE,
  death_date DATE,
  birthplace TEXT,
  epitaph TEXT,
  biography TEXT,
  cover_path TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX memorials_owner_idx ON public.memorials(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memorials TO authenticated;
GRANT SELECT ON public.memorials TO anon;
GRANT ALL ON public.memorials TO service_role;
ALTER TABLE public.memorials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage memorials" ON public.memorials FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Anyone views public memorials" ON public.memorials FOR SELECT TO anon, authenticated USING (visibility = 'public');

CREATE TABLE public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id UUID NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('story','photo','video','audio')),
  title TEXT NOT NULL,
  body TEXT,
  media_path TEXT,
  memory_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX memories_memorial_idx ON public.memories(memorial_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memories TO authenticated;
GRANT SELECT ON public.memories TO anon;
GRANT ALL ON public.memories TO service_role;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage memories" ON public.memories FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id AND EXISTS (SELECT 1 FROM public.memorials m WHERE m.id = memorial_id AND m.owner_id = auth.uid()));
CREATE POLICY "Anyone views memories of public memorials" ON public.memories FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.memorials m WHERE m.id = memorial_id AND m.visibility = 'public'));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER memorials_touch BEFORE UPDATE ON public.memorials FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage policies for the private "memories" bucket. Paths: {owner_id}/{memorial_id}/{file}
CREATE POLICY "Owners read own media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'memories' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners upload own media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'memories' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners update own media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'memories' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners delete own media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'memories' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Visitors read public memorial media" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'memories' AND (storage.foldername(name))[2] IN (SELECT id::text FROM public.memorials WHERE visibility = 'public'));