ALTER TABLE public.guru ADD COLUMN IF NOT EXISTS ttd_spesimen_path text;

-- Storage RLS for spesimen-ttd bucket: authenticated users can read/upload/update/delete
CREATE POLICY "spesimen_ttd_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'spesimen-ttd');
CREATE POLICY "spesimen_ttd_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'spesimen-ttd');
CREATE POLICY "spesimen_ttd_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'spesimen-ttd');
CREATE POLICY "spesimen_ttd_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'spesimen-ttd');