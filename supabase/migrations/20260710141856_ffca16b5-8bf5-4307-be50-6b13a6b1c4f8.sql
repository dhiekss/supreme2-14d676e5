ALTER TABLE public.kbm_laporan
  ADD COLUMN IF NOT EXISTS jam_list INT[] NOT NULL DEFAULT '{}'::int[],
  ADD COLUMN IF NOT EXISTS ttd_path TEXT,
  ADD COLUMN IF NOT EXISTS foto_path TEXT;

ALTER TABLE public.kbm_laporan ALTER COLUMN jam_mulai DROP NOT NULL;
ALTER TABLE public.kbm_laporan ALTER COLUMN jam_selesai DROP NOT NULL;
ALTER TABLE public.kbm_laporan ALTER COLUMN jam_mulai SET DEFAULT NULL;
ALTER TABLE public.kbm_laporan ALTER COLUMN jam_selesai SET DEFAULT NULL;