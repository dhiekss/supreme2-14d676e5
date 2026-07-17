
-- Broaden berkas_pembelajaran access to any authenticated user
DROP POLICY IF EXISTS berkas_pembelajaran_admin_all ON public.berkas_pembelajaran;
DROP POLICY IF EXISTS berkas_pembelajaran_auth_read ON public.berkas_pembelajaran;

CREATE POLICY berkas_pembelajaran_auth_select ON public.berkas_pembelajaran
  FOR SELECT TO authenticated USING (true);
CREATE POLICY berkas_pembelajaran_auth_insert ON public.berkas_pembelajaran
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY berkas_pembelajaran_auth_update ON public.berkas_pembelajaran
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY berkas_pembelajaran_admin_delete ON public.berkas_pembelajaran
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Broaden storage bucket policies to any authenticated user
DROP POLICY IF EXISTS berkas_pembelajaran_staff_select ON storage.objects;
DROP POLICY IF EXISTS berkas_pembelajaran_owner_insert ON storage.objects;
DROP POLICY IF EXISTS berkas_pembelajaran_owner_update ON storage.objects;
DROP POLICY IF EXISTS berkas_pembelajaran_owner_delete ON storage.objects;

CREATE POLICY berkas_pembelajaran_auth_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'berkas-pembelajaran');
CREATE POLICY berkas_pembelajaran_auth_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'berkas-pembelajaran');
CREATE POLICY berkas_pembelajaran_auth_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'berkas-pembelajaran')
  WITH CHECK (bucket_id = 'berkas-pembelajaran');
CREATE POLICY berkas_pembelajaran_auth_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'berkas-pembelajaran' AND (owner = auth.uid() OR is_admin(auth.uid())));
