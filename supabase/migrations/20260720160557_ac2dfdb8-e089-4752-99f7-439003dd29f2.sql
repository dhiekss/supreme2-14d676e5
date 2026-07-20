
ALTER TABLE public.jadwal_pelajaran
  ADD COLUMN IF NOT EXISTS kelompok_belajar_id uuid REFERENCES public.kelompok_belajar(id) ON DELETE CASCADE;

ALTER TABLE public.kbm_agenda
  ADD COLUMN IF NOT EXISTS kelompok_belajar_id uuid REFERENCES public.kelompok_belajar(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS jadwal_pelajaran_kb_idx ON public.jadwal_pelajaran(kelompok_belajar_id);
CREATE INDEX IF NOT EXISTS kbm_agenda_kb_idx ON public.kbm_agenda(kelompok_belajar_id);
