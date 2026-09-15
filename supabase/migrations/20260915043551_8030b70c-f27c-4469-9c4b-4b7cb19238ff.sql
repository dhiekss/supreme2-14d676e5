CREATE INDEX IF NOT EXISTS kbm_agenda_kehadiran_agenda_idx ON public.kbm_agenda_kehadiran (kbm_agenda_id);
CREATE INDEX IF NOT EXISTS kbm_agenda_tanggal_idx ON public.kbm_agenda (tanggal);
CREATE INDEX IF NOT EXISTS kbm_agenda_guru_idx ON public.kbm_agenda (guru_id);
CREATE INDEX IF NOT EXISTS kbm_agenda_rombel_idx ON public.kbm_agenda (rombel_id);