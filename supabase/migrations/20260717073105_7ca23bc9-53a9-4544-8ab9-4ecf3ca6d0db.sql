
-- Allow any authenticated user to manage their own KBM agenda (matched via profiles.nip = guru.nip)

CREATE POLICY "kbm_agenda_own_select" ON public.kbm_agenda
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.guru g
    JOIN public.profiles p ON p.nip = g.nip
    WHERE g.id = kbm_agenda.guru_id AND p.id = auth.uid()
  )
);

CREATE POLICY "kbm_agenda_own_insert" ON public.kbm_agenda
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.guru g
    JOIN public.profiles p ON p.nip = g.nip
    WHERE g.id = kbm_agenda.guru_id AND p.id = auth.uid()
  )
);

CREATE POLICY "kbm_agenda_own_update" ON public.kbm_agenda
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.guru g
    JOIN public.profiles p ON p.nip = g.nip
    WHERE g.id = kbm_agenda.guru_id AND p.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.guru g
    JOIN public.profiles p ON p.nip = g.nip
    WHERE g.id = kbm_agenda.guru_id AND p.id = auth.uid()
  )
);

CREATE POLICY "kbm_agenda_own_delete" ON public.kbm_agenda
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.guru g
    JOIN public.profiles p ON p.nip = g.nip
    WHERE g.id = kbm_agenda.guru_id AND p.id = auth.uid()
  )
);

-- Kehadiran: allow manage when linked agenda belongs to the user
CREATE POLICY "kbm_agenda_kehadiran_own_select" ON public.kbm_agenda_kehadiran
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.kbm_agenda a
    JOIN public.guru g ON g.id = a.guru_id
    JOIN public.profiles p ON p.nip = g.nip
    WHERE a.id = kbm_agenda_kehadiran.kbm_agenda_id AND p.id = auth.uid()
  )
);

CREATE POLICY "kbm_agenda_kehadiran_own_insert" ON public.kbm_agenda_kehadiran
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.kbm_agenda a
    JOIN public.guru g ON g.id = a.guru_id
    JOIN public.profiles p ON p.nip = g.nip
    WHERE a.id = kbm_agenda_kehadiran.kbm_agenda_id AND p.id = auth.uid()
  )
);

CREATE POLICY "kbm_agenda_kehadiran_own_update" ON public.kbm_agenda_kehadiran
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.kbm_agenda a
    JOIN public.guru g ON g.id = a.guru_id
    JOIN public.profiles p ON p.nip = g.nip
    WHERE a.id = kbm_agenda_kehadiran.kbm_agenda_id AND p.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.kbm_agenda a
    JOIN public.guru g ON g.id = a.guru_id
    JOIN public.profiles p ON p.nip = g.nip
    WHERE a.id = kbm_agenda_kehadiran.kbm_agenda_id AND p.id = auth.uid()
  )
);

CREATE POLICY "kbm_agenda_kehadiran_own_delete" ON public.kbm_agenda_kehadiran
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.kbm_agenda a
    JOIN public.guru g ON g.id = a.guru_id
    JOIN public.profiles p ON p.nip = g.nip
    WHERE a.id = kbm_agenda_kehadiran.kbm_agenda_id AND p.id = auth.uid()
  )
);
