-- Helper: apakah user terkait dengan guru tertentu (via NIP di profil)
create or replace function public.owns_guru(_user_id uuid, _guru_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.guru g on g.nip = p.nip
    where p.id = _user_id
      and g.id = _guru_id
      and p.nip is not null
      and p.nip <> ''
  )
$$;

-- Laporan TPG: pemilik akun (guru terkait) boleh mengelola laporannya sendiri
create policy "laporan_tpg_owner_select" on public.laporan_tpg
  for select to authenticated
  using (public.owns_guru(auth.uid(), guru_id));

create policy "laporan_tpg_owner_insert" on public.laporan_tpg
  for insert to authenticated
  with check (public.owns_guru(auth.uid(), guru_id));

create policy "laporan_tpg_owner_update" on public.laporan_tpg
  for update to authenticated
  using (public.owns_guru(auth.uid(), guru_id))
  with check (public.owns_guru(auth.uid(), guru_id));

create policy "laporan_tpg_owner_delete" on public.laporan_tpg
  for delete to authenticated
  using (public.owns_guru(auth.uid(), guru_id));

-- Kebijakan akses bucket tpg-bukti (bucket dibuat via Storage API)
create policy "tpg-bukti_staff_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'tpg-bukti' and public.is_staff(auth.uid()));

create policy "tpg-bukti_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'tpg-bukti' and owner = auth.uid());

create policy "tpg-bukti_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'tpg-bukti' and (owner = auth.uid() or public.has_role(auth.uid(), 'admin')))
  with check (bucket_id = 'tpg-bukti' and (owner = auth.uid() or public.has_role(auth.uid(), 'admin')));

create policy "tpg-bukti_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'tpg-bukti' and (owner = auth.uid() or public.has_role(auth.uid(), 'admin')));