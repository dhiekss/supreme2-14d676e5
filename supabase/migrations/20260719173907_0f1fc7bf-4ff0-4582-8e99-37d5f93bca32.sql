
-- Helper: can user access a given rombel (admin, superadmin, wali kelas by NIP, or user_rombel mapping)
CREATE OR REPLACE FUNCTION public.can_access_rombel(_user_id uuid, _rombel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'superadmin')
    OR EXISTS (SELECT 1 FROM public.user_rombel ur WHERE ur.user_id = _user_id AND ur.rombel_id = _rombel_id)
    OR EXISTS (
      SELECT 1 FROM public.rombel r
      JOIN public.profiles p ON p.id = _user_id
      WHERE r.id = _rombel_id AND p.nip IS NOT NULL AND r.wali_kelas_nip = p.nip
    );
$$;

-- attendance_records: allow insert/update/delete by users with rombel access
CREATE POLICY "attendance_records_rombel_access_insert"
  ON public.attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_rombel(auth.uid(), rombel_id));

CREATE POLICY "attendance_records_rombel_access_update"
  ON public.attendance_records FOR UPDATE
  TO authenticated
  USING (public.can_access_rombel(auth.uid(), rombel_id))
  WITH CHECK (public.can_access_rombel(auth.uid(), rombel_id));

CREATE POLICY "attendance_records_rombel_access_delete"
  ON public.attendance_records FOR DELETE
  TO authenticated
  USING (public.can_access_rombel(auth.uid(), rombel_id));

-- attendance_details: same via parent record's rombel
CREATE POLICY "attendance_details_rombel_access_insert"
  ON public.attendance_details FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.attendance_records ar
      WHERE ar.id = attendance_record_id
        AND public.can_access_rombel(auth.uid(), ar.rombel_id)
    )
  );

CREATE POLICY "attendance_details_rombel_access_update"
  ON public.attendance_details FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.attendance_records ar
      WHERE ar.id = attendance_record_id
        AND public.can_access_rombel(auth.uid(), ar.rombel_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.attendance_records ar
      WHERE ar.id = attendance_record_id
        AND public.can_access_rombel(auth.uid(), ar.rombel_id)
    )
  );

CREATE POLICY "attendance_details_rombel_access_delete"
  ON public.attendance_details FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.attendance_records ar
      WHERE ar.id = attendance_record_id
        AND public.can_access_rombel(auth.uid(), ar.rombel_id)
    )
  );
