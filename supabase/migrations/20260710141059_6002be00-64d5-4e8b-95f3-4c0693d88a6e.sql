CREATE TABLE public.kbm_laporan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tanggal DATE NOT NULL,
  jam_mulai INT NOT NULL DEFAULT 1,
  jam_selesai INT NOT NULL DEFAULT 1,
  rombel_id UUID REFERENCES public.rombel(id) ON DELETE SET NULL,
  mata_pelajaran_id UUID REFERENCES public.mata_pelajaran(id) ON DELETE SET NULL,
  guru_id UUID REFERENCES public.guru(id) ON DELETE SET NULL,
  guru_status TEXT NOT NULL DEFAULT 'Hadir',
  materi TEXT,
  capaian_pembelajaran TEXT,
  jumlah_hadir INT NOT NULL DEFAULT 0,
  jumlah_izin INT NOT NULL DEFAULT 0,
  jumlah_sakit INT NOT NULL DEFAULT 0,
  jumlah_alpa INT NOT NULL DEFAULT 0,
  catatan TEXT,
  semester_id UUID REFERENCES public.semester(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kbm_laporan TO authenticated;
GRANT ALL ON public.kbm_laporan TO service_role;

ALTER TABLE public.kbm_laporan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kbm_laporan_select_authenticated"
  ON public.kbm_laporan FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "kbm_laporan_insert_own"
  ON public.kbm_laporan FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "kbm_laporan_update_own_or_admin"
  ON public.kbm_laporan FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "kbm_laporan_delete_own_or_admin"
  ON public.kbm_laporan FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_kbm_laporan_updated_at
  BEFORE UPDATE ON public.kbm_laporan
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_kbm_laporan_tanggal ON public.kbm_laporan(tanggal DESC);
CREATE INDEX idx_kbm_laporan_guru ON public.kbm_laporan(guru_id);
CREATE INDEX idx_kbm_laporan_rombel ON public.kbm_laporan(rombel_id);
