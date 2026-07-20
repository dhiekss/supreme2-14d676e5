
-- Kelompok Belajar
CREATE TABLE public.kelompok_belajar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kelompok_belajar TO authenticated;
GRANT ALL ON public.kelompok_belajar TO service_role;
ALTER TABLE public.kelompok_belajar ENABLE ROW LEVEL SECURITY;
CREATE POLICY kelompok_belajar_read ON public.kelompok_belajar FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY kelompok_belajar_admin_all ON public.kelompok_belajar FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER kelompok_belajar_updated BEFORE UPDATE ON public.kelompok_belajar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.kelompok_belajar_pembimbing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kelompok_id uuid NOT NULL REFERENCES public.kelompok_belajar(id) ON DELETE CASCADE,
  pembimbing_type text NOT NULL CHECK (pembimbing_type IN ('guru','tendik')),
  pembimbing_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kelompok_id, pembimbing_type, pembimbing_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kelompok_belajar_pembimbing TO authenticated;
GRANT ALL ON public.kelompok_belajar_pembimbing TO service_role;
ALTER TABLE public.kelompok_belajar_pembimbing ENABLE ROW LEVEL SECURITY;
CREATE POLICY kbp_read ON public.kelompok_belajar_pembimbing FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY kbp_admin_all ON public.kelompok_belajar_pembimbing FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE INDEX kbp_kelompok_idx ON public.kelompok_belajar_pembimbing(kelompok_id);

CREATE TABLE public.kelompok_belajar_anggota (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kelompok_id uuid NOT NULL REFERENCES public.kelompok_belajar(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kelompok_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kelompok_belajar_anggota TO authenticated;
GRANT ALL ON public.kelompok_belajar_anggota TO service_role;
ALTER TABLE public.kelompok_belajar_anggota ENABLE ROW LEVEL SECURITY;
CREATE POLICY kba_read ON public.kelompok_belajar_anggota FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY kba_admin_all ON public.kelompok_belajar_anggota FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE INDEX kba_kelompok_idx ON public.kelompok_belajar_anggota(kelompok_id);
CREATE INDEX kba_student_idx ON public.kelompok_belajar_anggota(student_id);
