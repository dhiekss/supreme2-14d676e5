
CREATE POLICY attendance_records_any_auth_insert ON public.attendance_records
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY attendance_records_any_auth_update ON public.attendance_records
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY attendance_details_any_auth_insert ON public.attendance_details
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY attendance_details_any_auth_update ON public.attendance_details
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY attendance_details_any_auth_delete ON public.attendance_details
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
