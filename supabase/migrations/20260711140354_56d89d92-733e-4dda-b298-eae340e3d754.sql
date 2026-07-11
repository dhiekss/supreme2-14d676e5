
-- Tambah kolom untuk mencocokkan mockup Surat Keluar
ALTER TABLE public.surat_keluar
  ADD COLUMN IF NOT EXISTS kode_surat text,
  ADD COLUMN IF NOT EXISTS nomor_urut integer;

CREATE INDEX IF NOT EXISTS idx_surat_keluar_tanggal ON public.surat_keluar (tanggal_surat DESC);
CREATE INDEX IF NOT EXISTS idx_surat_keluar_kode ON public.surat_keluar (kode_surat);
CREATE INDEX IF NOT EXISTS idx_surat_keluar_status ON public.surat_keluar (status);

-- Tabel nomor surat yang diamankan (reserved) per kode
CREATE TABLE IF NOT EXISTS public.persuratan_nomor_diamankan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_surat text NOT NULL,
  nomor_urut integer NOT NULL,
  tanggal_diamankan date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'tersedia', -- tersedia | digunakan | dibatalkan
  used_by_surat_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kode_surat, nomor_urut)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.persuratan_nomor_diamankan TO authenticated;
GRANT ALL ON public.persuratan_nomor_diamankan TO service_role;

ALTER TABLE public.persuratan_nomor_diamankan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nomor_diamankan_read"
  ON public.persuratan_nomor_diamankan FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "nomor_diamankan_admin_all"
  ON public.persuratan_nomor_diamankan FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_persuratan_nomor_diamankan_updated_at
  BEFORE UPDATE ON public.persuratan_nomor_diamankan
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_nomor_diamankan_kode_status
  ON public.persuratan_nomor_diamankan (kode_surat, status);
