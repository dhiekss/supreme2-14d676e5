
CREATE POLICY "late_records_rombel_access_insert" ON public.late_records
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_rombel(auth.uid(), rombel_id));

CREATE POLICY "late_records_rombel_access_update" ON public.late_records
  FOR UPDATE TO authenticated
  USING (public.can_access_rombel(auth.uid(), rombel_id))
  WITH CHECK (public.can_access_rombel(auth.uid(), rombel_id));

CREATE POLICY "late_records_rombel_access_delete" ON public.late_records
  FOR DELETE TO authenticated
  USING (public.can_access_rombel(auth.uid(), rombel_id));
