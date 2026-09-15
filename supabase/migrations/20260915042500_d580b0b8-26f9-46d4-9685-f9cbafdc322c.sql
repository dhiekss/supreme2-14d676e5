CREATE POLICY "tujuan_pembelajaran_teacher_insert"
ON public.tujuan_pembelajaran FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rombel_mata_pelajaran rmp
    JOIN public.guru g ON g.id = rmp.guru_id
    JOIN public.profiles p ON p.id = auth.uid() AND p.nip = g.nip
    WHERE rmp.id = tujuan_pembelajaran.rombel_mata_pelajaran_id
      AND rmp.deleted_at IS NULL
  )
);
CREATE POLICY "tujuan_pembelajaran_teacher_update"
ON public.tujuan_pembelajaran FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rombel_mata_pelajaran rmp
    JOIN public.guru g ON g.id = rmp.guru_id
    JOIN public.profiles p ON p.id = auth.uid() AND p.nip = g.nip
    WHERE rmp.id = tujuan_pembelajaran.rombel_mata_pelajaran_id
      AND rmp.deleted_at IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rombel_mata_pelajaran rmp
    JOIN public.guru g ON g.id = rmp.guru_id
    JOIN public.profiles p ON p.id = auth.uid() AND p.nip = g.nip
    WHERE rmp.id = tujuan_pembelajaran.rombel_mata_pelajaran_id
      AND rmp.deleted_at IS NULL
  )
);
CREATE POLICY "tujuan_pembelajaran_teacher_delete"
ON public.tujuan_pembelajaran FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rombel_mata_pelajaran rmp
    JOIN public.guru g ON g.id = rmp.guru_id
    JOIN public.profiles p ON p.id = auth.uid() AND p.nip = g.nip
    WHERE rmp.id = tujuan_pembelajaran.rombel_mata_pelajaran_id
      AND rmp.deleted_at IS NULL
  )
);
CREATE POLICY "nilai_siswa_teacher_insert"
ON public.nilai_siswa FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tujuan_pembelajaran tp
    JOIN public.rombel_mata_pelajaran rmp ON rmp.id = tp.rombel_mata_pelajaran_id
    JOIN public.guru g ON g.id = rmp.guru_id
    JOIN public.profiles p ON p.id = auth.uid() AND p.nip = g.nip
    WHERE tp.id = nilai_siswa.tujuan_pembelajaran_id
      AND rmp.deleted_at IS NULL
  )
);
CREATE POLICY "nilai_siswa_teacher_update"
ON public.nilai_siswa FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tujuan_pembelajaran tp
    JOIN public.rombel_mata_pelajaran rmp ON rmp.id = tp.rombel_mata_pelajaran_id
    JOIN public.guru g ON g.id = rmp.guru_id
    JOIN public.profiles p ON p.id = auth.uid() AND p.nip = g.nip
    WHERE tp.id = nilai_siswa.tujuan_pembelajaran_id
      AND rmp.deleted_at IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tujuan_pembelajaran tp
    JOIN public.rombel_mata_pelajaran rmp ON rmp.id = tp.rombel_mata_pelajaran_id
    JOIN public.guru g ON g.id = rmp.guru_id
    JOIN public.profiles p ON p.id = auth.uid() AND p.nip = g.nip
    WHERE tp.id = nilai_siswa.tujuan_pembelajaran_id
      AND rmp.deleted_at IS NULL
  )
);
CREATE POLICY "nilai_siswa_teacher_delete"
ON public.nilai_siswa FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tujuan_pembelajaran tp
    JOIN public.rombel_mata_pelajaran rmp ON rmp.id = tp.rombel_mata_pelajaran_id
    JOIN public.guru g ON g.id = rmp.guru_id
    JOIN public.profiles p ON p.id = auth.uid() AND p.nip = g.nip
    WHERE tp.id = nilai_siswa.tujuan_pembelajaran_id
      AND rmp.deleted_at IS NULL
  )
);