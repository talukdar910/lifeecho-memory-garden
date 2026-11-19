CREATE TABLE public.admin_invites (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_invites TO service_role;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

INSERT INTO public.admin_invites (email) VALUES ('mustofaaazeenfr@gmail.com');

CREATE OR REPLACE FUNCTION public.grant_invited_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.admin_invites WHERE lower(email) = lower(NEW.email)) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created_grant_admin AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.grant_invited_admin();

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin' FROM auth.users u JOIN public.admin_invites i ON lower(i.email) = lower(u.email)
ON CONFLICT DO NOTHING;