-- Fix murid dengan status 'tinggal' yang rombel_id-nya sempat di-null-kan oleh bug kenaikan
UPDATE public.students s
SET rombel_id = sp.rombel_asal_id
FROM public.student_promotions sp
WHERE sp.student_id = s.id
  AND sp.status = 'tinggal'
  AND sp.rombel_tujuan_id IS NULL
  AND s.rombel_id IS NULL
  AND sp.rombel_asal_id IS NOT NULL;

-- Backfill rombel_tujuan agar riwayat mencerminkan kelas tempat murid tetap tinggal
UPDATE public.student_promotions
SET rombel_tujuan_id = rombel_asal_id,
    rombel_tujuan_name = rombel_asal_name
WHERE status = 'tinggal' AND rombel_tujuan_id IS NULL;