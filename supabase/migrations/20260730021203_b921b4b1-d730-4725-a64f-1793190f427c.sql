CREATE TABLE public.student_transfers_in (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid,
  student_name text NOT NULL,
  student_nis text,
  student_nisn text,
  gender text,
  sekolah_asal text,
  rombel_tujuan_id uuid,
  rombel_tujuan_name text,
  tanggal_surat date,
  tanggal_diterima date,
  file_surat text,
  dapodik_status text DEFAULT 'belum',
  dapodik_tanggal date,
  keterangan text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_transfers_in TO authenticated;
GRANT ALL ON public.student_transfers_in TO service_role;

ALTER TABLE public.student_transfers_in ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transfers_in_select" ON public.student_transfers_in FOR SELECT TO authenticated USING (true);
CREATE POLICY "transfers_in_insert" ON public.student_transfers_in FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "transfers_in_update" ON public.student_transfers_in FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "transfers_in_delete" ON public.student_transfers_in FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_student_transfers_in_updated_at
BEFORE UPDATE ON public.student_transfers_in
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();