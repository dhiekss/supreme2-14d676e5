
CREATE TABLE public.menu_layouts (
  role app_role PRIMARY KEY,
  layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_layouts TO authenticated;
GRANT ALL ON public.menu_layouts TO service_role;

ALTER TABLE public.menu_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read menu layouts"
  ON public.menu_layouts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert menu layouts"
  ON public.menu_layouts FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update menu layouts"
  ON public.menu_layouts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete menu layouts"
  ON public.menu_layouts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_menu_layouts_updated_at
  BEFORE UPDATE ON public.menu_layouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
