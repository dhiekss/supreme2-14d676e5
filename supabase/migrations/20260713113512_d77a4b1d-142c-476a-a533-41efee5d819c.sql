
CREATE TABLE IF NOT EXISTS public.pengecualian_input (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lingkup TEXT NOT NULL CHECK (lingkup IN ('rombel','tingkat','konsentrasi_keahlian')),
  target_rombel_id UUID NULL REFERENCES public.rombel(id) ON DELETE CASCADE,
  target_tingkat TEXT NULL,
  target_konsentrasi_id UUID NULL REFERENCES public.konsentrasi_keahlian(id) ON DELETE CASCADE,
  modul TEXT NOT NULL CHECK (modul IN ('presensi','kbm','audit')),
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  keterangan TEXT NULL,
  aktif BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pengecualian_input TO authenticated;
GRANT ALL ON public.pengecualian_input TO service_role;

ALTER TABLE public.pengecualian_input ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pengecualian_input_admin_all"
  ON public.pengecualian_input
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "pengecualian_input_auth_read"
  ON public.pengecualian_input
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP TRIGGER IF EXISTS trg_pengecualian_input_updated_at ON public.pengecualian_input;
CREATE TRIGGER trg_pengecualian_input_updated_at
  BEFORE UPDATE ON public.pengecualian_input
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_pengecualian_input_periode
  ON public.pengecualian_input(tanggal_mulai, tanggal_selesai);
CREATE INDEX IF NOT EXISTS idx_pengecualian_input_aktif
  ON public.pengecualian_input(aktif);
