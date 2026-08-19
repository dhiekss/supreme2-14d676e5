revoke execute on function public.owns_guru(uuid, uuid) from public, anon;
grant execute on function public.owns_guru(uuid, uuid) to authenticated;