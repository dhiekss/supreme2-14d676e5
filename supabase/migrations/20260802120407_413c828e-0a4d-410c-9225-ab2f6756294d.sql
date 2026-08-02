CREATE TABLE public.wali_tindakan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  rombel_id uuid,
  tanggal date NOT NULL,
  jumlah_alfa integer NOT NULL DEFAULT 0,
  jumlah_terlambat integer NOT NULL DEFAULT 0,
  keterangan text,
  foto_path text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wali_tindakan TO authenticated;
GRANT ALL ON public.wali_tindakan TO service_role;

ALTER TABLE public.wali_tindakan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wali_tindakan_select_staff" ON public.wali_tindakan FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "wali_tindakan_insert_staff" ON public.wali_tindakan FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "wali_tindakan_update_staff" ON public.wali_tindakan FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "wali_tindakan_delete_own_or_admin" ON public.wali_tindakan FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE INDEX idx_wali_tindakan_student ON public.wali_tindakan(student_id, tanggal DESC);

CREATE TRIGGER update_wali_tindakan_updated_at BEFORE UPDATE ON public.wali_tindakan
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();