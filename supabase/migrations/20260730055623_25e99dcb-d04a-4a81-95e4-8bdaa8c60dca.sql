CREATE TABLE public.student_identity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  changed_by uuid,
  changed_by_name text,
  changed_by_email text,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX student_identity_logs_student_idx ON public.student_identity_logs (student_id, created_at DESC);

GRANT SELECT, INSERT ON public.student_identity_logs TO authenticated;
GRANT ALL ON public.student_identity_logs TO service_role;

ALTER TABLE public.student_identity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read student identity logs"
ON public.student_identity_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can insert student identity logs"
ON public.student_identity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = changed_by);