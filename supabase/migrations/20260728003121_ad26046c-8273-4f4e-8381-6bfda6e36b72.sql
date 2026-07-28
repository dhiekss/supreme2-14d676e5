DELETE FROM public.late_records a
USING public.late_records b
WHERE a.student_id = b.student_id
  AND a.record_date = b.record_date
  AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS late_records_unique_student_date
  ON public.late_records (student_id, record_date);