
-- =============================================
-- SECURITY HARDENING MIGRATION
-- =============================================

-- 1. Helper: is_staff — user has at least one role in user_roles
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

-- 2. Fix SECURITY DEFINER helpers so they're not executable arbitrarily.
--    has_role & is_admin only query the caller's own rows in user_roles,
--    which the caller can already read via RLS — switch to SECURITY INVOKER.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;

-- Trigger-only functions: revoke EXECUTE from clients (triggers still fire).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;

-- 3. Restrict profiles reads to self + admin.
DROP POLICY IF EXISTS "profiles self read" ON public.profiles;
CREATE POLICY "profiles self or admin read"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 4. Tighten every *_auth_read policy in public schema:
--    only staff members (users with any role) can SELECT, no longer everyone.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND policyname LIKE '%_auth_read'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I FOR SELECT TO authenticated USING (public.is_staff(auth.uid()))',
      r.policyname, r.schemaname, r.tablename
    );
  END LOOP;
END $$;

-- 5. Storage: berkas-pembelajaran — enforce ownership on write paths.
DROP POLICY IF EXISTS berkas_pembelajaran_auth_select ON storage.objects;
DROP POLICY IF EXISTS berkas_pembelajaran_auth_insert ON storage.objects;
DROP POLICY IF EXISTS berkas_pembelajaran_auth_update ON storage.objects;
DROP POLICY IF EXISTS berkas_pembelajaran_auth_delete ON storage.objects;

CREATE POLICY berkas_pembelajaran_staff_select
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'berkas-pembelajaran' AND public.is_staff(auth.uid()));

CREATE POLICY berkas_pembelajaran_owner_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'berkas-pembelajaran' AND public.is_staff(auth.uid()) AND owner = auth.uid());

CREATE POLICY berkas_pembelajaran_owner_update
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'berkas-pembelajaran' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')))
WITH CHECK (bucket_id = 'berkas-pembelajaran' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY berkas_pembelajaran_owner_delete
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'berkas-pembelajaran' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

-- 6. Storage: add explicit ownership policies for other private buckets.
DO $$
DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['kbm-foto','sp-dokumen','verval-dokumen','surat-files']
  LOOP
    EXECUTE format($f$
      CREATE POLICY %I ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = %L AND public.is_staff(auth.uid()))
    $f$, b || '_staff_select', b);

    EXECUTE format($f$
      CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = %L AND public.is_staff(auth.uid()) AND owner = auth.uid())
    $f$, b || '_owner_insert', b);

    EXECUTE format($f$
      CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = %L AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')))
      WITH CHECK (bucket_id = %L AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')))
    $f$, b || '_owner_update', b, b);

    EXECUTE format($f$
      CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = %L AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')))
    $f$, b || '_owner_delete', b);
  END LOOP;
END $$;
