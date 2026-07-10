
DO $$ BEGIN
  CREATE TYPE public.promotion_status AS ENUM ('naik','tinggal','lulus','keluar');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.student_promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL,
  student_id UUID,
  student_name TEXT,
  student_nis TEXT,
  rombel_asal_id UUID,
  rombel_asal_name TEXT,
  rombel_tujuan_id UUID,
  rombel_tujuan_name TEXT,
  tahun_ajaran_asal_id UUID,
  tahun_ajaran_tujuan_id UUID,
  semester_asal_id UUID,
  semester_tujuan_id UUID,
  status public.promotion_status NOT NULL,
  tanggal_proses DATE NOT NULL DEFAULT CURRENT_DATE,
  catatan TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_promotions_batch ON public.student_promotions(batch_id);
CREATE INDEX idx_student_promotions_student ON public.student_promotions(student_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_promotions TO authenticated;
GRANT ALL ON public.student_promotions TO service_role;

ALTER TABLE public.student_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read promotions" ON public.student_promotions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth insert promotions" ON public.student_promotions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "admin update promotions" ON public.student_promotions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "admin delete promotions" ON public.student_promotions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_student_promotions_updated_at
  BEFORE UPDATE ON public.student_promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
