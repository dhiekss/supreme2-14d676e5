CREATE TABLE public.tendik (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  nip TEXT,
  jenis_kelamin TEXT,
  status_kepegawaian TEXT,
  golongan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tendik TO authenticated;
GRANT ALL ON public.tendik TO service_role;
ALTER TABLE public.tendik ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view tendik" ON public.tendik FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert tendik" ON public.tendik FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update tendik" ON public.tendik FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete tendik" ON public.tendik FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_tendik_updated_at BEFORE UPDATE ON public.tendik FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();