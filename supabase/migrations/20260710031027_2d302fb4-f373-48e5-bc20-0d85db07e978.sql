CREATE OR REPLACE FUNCTION public.exec_sql(query text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  EXECUTE query;
END;
$$;
GRANT ALL ON FUNCTION public.exec_sql(text) TO service_role;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC, anon, authenticated;