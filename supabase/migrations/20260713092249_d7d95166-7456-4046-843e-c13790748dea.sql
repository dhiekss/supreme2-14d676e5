
-- Snapshot columns for rombel transfers so history survives student/rombel renames or deletes
ALTER TABLE public.student_rombel_transfers
  ADD COLUMN IF NOT EXISTS student_name text,
  ADD COLUMN IF NOT EXISTS student_nis text,
  ADD COLUMN IF NOT EXISTS rombel_asal_name text,
  ADD COLUMN IF NOT EXISTS rombel_tujuan_name text;

-- Backfill existing rows
UPDATE public.student_rombel_transfers t
SET student_name = COALESCE(t.student_name, s.name),
    student_nis = COALESCE(t.student_nis, s.nis)
FROM public.students s
WHERE t.student_id = s.id
  AND (t.student_name IS NULL OR t.student_nis IS NULL);

UPDATE public.student_rombel_transfers t
SET rombel_asal_name = COALESCE(t.rombel_asal_name, r.name)
FROM public.rombel r
WHERE t.rombel_asal_id = r.id AND t.rombel_asal_name IS NULL;

UPDATE public.student_rombel_transfers t
SET rombel_tujuan_name = COALESCE(t.rombel_tujuan_name, r.name)
FROM public.rombel r
WHERE t.rombel_tujuan_id = r.id AND t.rombel_tujuan_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_student_rombel_transfers_student ON public.student_rombel_transfers(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_promotions_student ON public.student_promotions(student_id, created_at DESC);
