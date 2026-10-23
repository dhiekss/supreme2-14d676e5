CREATE TABLE public.pjj_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 created_by uuid NOT NULL,
 tanggal date NOT NULL,
 rombel_id uuid NOT NULL REFERENCES public.rombel(id),
 mata_pelajaran_id uuid NOT NULL REFERENCES public.mata_pelajaran(id),
 jam_list integer[] NOT NULL DEFAULT '{}',
 tujuan_pembelajaran text NOT NULL DEFAULT '',
 materi text NOT NULL DEFAULT '',
 murid_aktif jsonb NOT NULL DEFAULT '[]'::jsonb,
 bukti_instruksi_path text NOT NULL,
 bukti_terkumpul_path text NOT NULL,
 ttd_guru text NOT NULL DEFAULT '',
 semester_id uuid REFERENCES public.semester(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pjj_reports TO authenticated;
GRANT ALL ON public.pjj_reports TO service_role;
ALTER TABLE public.pjj_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY pjj_read ON public.pjj_reports FOR SELECT TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY pjj_insert ON public.pjj_reports FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY pjj_update ON public.pjj_reports FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY pjj_delete ON public.pjj_reports FOR DELETE TO authenticated USING (created_by = auth.uid());
CREATE INDEX pjj_reports_owner_date_idx ON public.pjj_reports(created_by, tanggal DESC);
CREATE POLICY pjj_photo_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pjj-bukti' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY pjj_photo_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'pjj-bukti' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')));
CREATE POLICY pjj_photo_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'pjj-bukti' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE TRIGGER pjj_updated_at BEFORE UPDATE ON public.pjj_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();