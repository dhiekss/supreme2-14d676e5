
REVOKE EXECUTE ON FUNCTION public.auto_reserve_nomor_surat() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_reserve_nomor_surat() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_reserve_nomor_surat() TO service_role;
