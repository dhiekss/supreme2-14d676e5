ALTER TABLE public.berkas_pembelajaran
  ADD COLUMN IF NOT EXISTS analisis_cp_atp_link text,
  ADD COLUMN IF NOT EXISTS rpa_link text;