
-- Link surat_tugas -> surat_keluar
ALTER TABLE public.surat_tugas
  ADD COLUMN IF NOT EXISTS surat_keluar_id uuid UNIQUE REFERENCES public.surat_keluar(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_surat_tugas_surat_keluar_id ON public.surat_tugas(surat_keluar_id);
CREATE INDEX IF NOT EXISTS idx_surat_tugas_tanggal ON public.surat_tugas(tanggal_mulai DESC);

-- Backfill: setiap surat_keluar kode 805 yg blm ada di surat_tugas
INSERT INTO public.surat_tugas (
  surat_keluar_id, nomor_surat, jenis, tanggal_mulai, tanggal_selesai,
  tujuan_lokasi, keperluan, pembuat_id, status
)
SELECT sk.id, sk.nomor_surat, 'Surat Tugas', sk.tanggal_surat, sk.tanggal_surat,
       sk.tujuan, COALESCE(NULLIF(sk.isi_ringkas,''), sk.perihal),
       sk.pembuat_id, COALESCE(sk.status, 'aktif')
FROM public.surat_keluar sk
WHERE sk.kode_surat = '805'
  AND NOT EXISTS (SELECT 1 FROM public.surat_tugas st WHERE st.surat_keluar_id = sk.id);

-- Trigger sync surat_keluar -> surat_tugas
CREATE OR REPLACE FUNCTION public.sync_surat_keluar_to_tugas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.kode_surat <> '805' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.surat_tugas (
      surat_keluar_id, nomor_surat, jenis, tanggal_mulai, tanggal_selesai,
      tujuan_lokasi, keperluan, pembuat_id, status
    ) VALUES (
      NEW.id, NEW.nomor_surat, 'Surat Tugas', NEW.tanggal_surat, NEW.tanggal_surat,
      NEW.tujuan, COALESCE(NULLIF(NEW.isi_ringkas,''), NEW.perihal),
      NEW.pembuat_id, COALESCE(NEW.status,'aktif')
    )
    ON CONFLICT (surat_keluar_id) DO NOTHING;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.surat_tugas SET
      nomor_surat = NEW.nomor_surat,
      status = COALESCE(NEW.status, status),
      updated_at = now()
    WHERE surat_keluar_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_surat_keluar_to_tugas ON public.surat_keluar;
CREATE TRIGGER trg_sync_surat_keluar_to_tugas
AFTER INSERT OR UPDATE ON public.surat_keluar
FOR EACH ROW EXECUTE FUNCTION public.sync_surat_keluar_to_tugas();
