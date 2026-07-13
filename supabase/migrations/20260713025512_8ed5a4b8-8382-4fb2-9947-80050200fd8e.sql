
CREATE POLICY "mutasi read auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'mutasi');
CREATE POLICY "mutasi insert auth" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mutasi');
CREATE POLICY "mutasi update auth" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'mutasi');
CREATE POLICY "mutasi delete auth" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'mutasi');
