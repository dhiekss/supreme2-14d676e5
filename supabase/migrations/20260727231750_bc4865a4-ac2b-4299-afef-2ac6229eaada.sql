DROP POLICY IF EXISTS late_records_rombel_access_insert ON public.late_records;
CREATE POLICY late_records_any_authenticated_insert ON public.late_records
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);