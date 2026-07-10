ALTER TABLE public.kbm_laporan
  ADD COLUMN IF NOT EXISTS jam_status JSONB NOT NULL DEFAULT '{}'::jsonb;