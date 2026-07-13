
CREATE OR REPLACE FUNCTION public.auto_reserve_nomor_surat()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active text;
  v_count  int;
  v_days   text;
  v_kode   text := '*';
  v_today  date := CURRENT_DATE;
  v_dow    int  := EXTRACT(DOW FROM CURRENT_DATE)::int;
  v_days_arr int[];
  v_exists int;
  v_max_sk int;
  v_max_nd int;
  v_next   int;
  v_i      int;
  v_inserted int := 0;
BEGIN
  SELECT value INTO v_active FROM public.persuratan_pengaturan_umum WHERE key='reserve_active';
  SELECT value INTO v_count  FROM public.persuratan_pengaturan_umum WHERE key='reserve_count_per_day';
  SELECT value INTO v_days   FROM public.persuratan_pengaturan_umum WHERE key='reserve_days';

  IF COALESCE(v_active,'false') <> 'true' THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'inactive');
  END IF;
  IF v_count IS NULL OR v_count <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'no_count');
  END IF;

  BEGIN
    SELECT array_agg((x)::int) INTO v_days_arr
    FROM jsonb_array_elements_text(COALESCE(v_days,'[]')::jsonb) AS x;
  EXCEPTION WHEN OTHERS THEN
    v_days_arr := ARRAY[]::int[];
  END;

  IF v_days_arr IS NULL OR NOT (v_dow = ANY(v_days_arr)) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'not_a_reserve_day', 'dow', v_dow);
  END IF;

  -- Idempotency: only reserve once per day
  SELECT COUNT(*) INTO v_exists
  FROM public.persuratan_nomor_diamankan
  WHERE kode_surat = v_kode AND tanggal_diamankan = v_today;
  IF v_exists > 0 THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'already_reserved_today', 'existing', v_exists);
  END IF;

  -- Compute next nomor_urut across ALL kode_surat (numbers are shared)
  SELECT COALESCE(MAX(nomor_urut),0) INTO v_max_sk FROM public.surat_keluar;
  SELECT COALESCE(MAX(nomor_urut),0) INTO v_max_nd FROM public.persuratan_nomor_diamankan;
  v_next := GREATEST(v_max_sk, v_max_nd) + 1;

  FOR v_i IN 0 .. (v_count - 1) LOOP
    BEGIN
      INSERT INTO public.persuratan_nomor_diamankan (kode_surat, nomor_urut, tanggal_diamankan, status)
      VALUES (v_kode, v_next + v_i, v_today, 'tersedia');
      v_inserted := v_inserted + 1;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'inserted', v_inserted, 'from', v_next, 'tanggal', v_today);
END;
$$;
