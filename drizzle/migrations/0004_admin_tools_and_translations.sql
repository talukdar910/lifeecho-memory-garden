CREATE TABLE public.memory_translations (
  memory_id uuid NOT NULL REFERENCES public.life_memories(id) ON DELETE CASCADE,
  language text NOT NULL,
  title text NOT NULL,
  body text,
  source_updated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (memory_id, language)
);
GRANT ALL ON public.memory_translations TO service_role;
ALTER TABLE public.memory_translations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.report_memory(_memory_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  IF length(trim(coalesce(_reason, ''))) < 3 THEN RAISE EXCEPTION 'Please tell us what is wrong'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.life_memories m
    WHERE m.id = _memory_id AND m.hidden = false AND m.owner_id <> auth.uid()
      AND (m.privacy = 'public'
           OR (m.privacy = 'legacy' AND public.is_verified_archived(m.owner_id) AND public.is_legacy_contact(m.owner_id)))
  ) THEN
    RAISE EXCEPTION 'Memory not found';
  END IF;
  INSERT INTO public.content_reports (memory_id, reporter_id, reason) VALUES (_memory_id, auth.uid(), left(trim(_reason), 1000));
  INSERT INTO public.audit_log (actor_id, action, target) VALUES (auth.uid(), 'content.reported', _memory_id::text);
END; $$;

CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_set_admin(_user_id uuid, _make_admin boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF _make_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    IF _user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot remove your own admin access'; END IF;
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  END IF;
  INSERT INTO public.audit_log (actor_id, action, target) VALUES (auth.uid(), CASE WHEN _make_admin THEN 'role.admin_granted' ELSE 'role.admin_removed' END, _user_id::text);
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_admin(uuid, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_set_admin(uuid, boolean) TO authenticated;