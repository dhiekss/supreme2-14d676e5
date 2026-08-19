CREATE TABLE public.referensi_tpg_kenaikan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referensi_tpg_id uuid NOT NULL REFERENCES public.referensi_tpg(id) ON DELETE CASCADE,
  gaji_pokok bigint NOT NULL DEFAULT 0,
  tanggal_berlaku date NOT NULL,
  catatan text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_referensi_tpg_kenaikan_ref ON public.referensi_tpg_kenaikan (referensi_tpg_id, tanggal_berlaku);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referensi_tpg_kenaikan TO authenticated;
GRANT ALL ON public.referensi_tpg_kenaikan TO service_role;

ALTER TABLE public.referensi_tpg_kenaikan ENABLE ROW LEVEL SECURITY;

CREATE POLICY referensi_tpg_kenaikan_admin_all ON public.referensi_tpg_kenaikan
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY referensi_tpg_kenaikan_auth_read ON public.referensi_tpg_kenaikan
  FOR SELECT USING (is_staff(auth.uid()));