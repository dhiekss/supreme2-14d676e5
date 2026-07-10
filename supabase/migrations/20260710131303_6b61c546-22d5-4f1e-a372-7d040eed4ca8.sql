
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_key_unique UNIQUE (key);

CREATE POLICY "app_settings_public_display_read" ON public.app_settings
  FOR SELECT TO anon, authenticated
  USING (key LIKE 'display.%');

GRANT SELECT ON public.app_settings TO anon;

INSERT INTO public.app_settings (key, value, description) VALUES
  ('display.app_name', 'SUPREME XPOES', 'Nama aplikasi'),
  ('display.subtitle', 'Students Presence and', 'Subtitle aplikasi'),
  ('display.instansi', 'Management of Education', 'Nama instansi'),
  ('display.footer', '© 2025 SUPREME - Students Presence and Management of Education - Bidang Kurikulum SMKN 1 Pusakanagara', 'Teks footer'),
  ('display.logo_url', '', 'URL / Data URL logo sekolah'),
  ('display.bg_url', '', 'URL / Data URL gambar background login'),
  ('display.bg_color', '#c8fefb', 'Warna fallback background login')
ON CONFLICT (key) DO NOTHING;
