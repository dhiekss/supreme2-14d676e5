
-- 1) Default settings for "Nomor Diamankan"
INSERT INTO public.persuratan_pengaturan_umum (key, value, deskripsi)
VALUES
  ('reserve_active', 'true', 'Aktifkan pengamanan nomor surat otomatis'),
  ('reserve_count_per_day', '3', 'Jumlah nomor surat yang diamankan setiap hari'),
  ('reserve_days', '[1,2,3,4,5]', 'Hari aktif pengamanan nomor (0=Minggu ... 6=Sabtu), format JSON array'),
  ('reserve_kode_surat', '000', 'Kode surat default yang diamankan')
ON CONFLICT DO NOTHING;

-- Ensure "key" is unique for upserts / lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='persuratan_pengaturan_umum_key_key'
  ) THEN
    BEGIN
      ALTER TABLE public.persuratan_pengaturan_umum
        ADD CONSTRAINT persuratan_pengaturan_umum_key_key UNIQUE (key);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 2) The auto-reserve function
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
  v_kode   text;
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
  SELECT value INTO v_kode   FROM public.persuratan_pengaturan_umum WHERE key='reserve_kode_surat';

  IF COALESCE(v_active,'false') <> 'true' THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'inactive');
  END IF;

  IF v_count IS NULL OR v_count <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'no_count');
  END IF;

  v_kode := COALESCE(NULLIF(v_kode,''), '000');

  -- parse json array of weekdays
  BEGIN
    SELECT array_agg((x)::int) INTO v_days_arr
    FROM jsonb_array_elements_text(COALESCE(v_days,'[]')::jsonb) AS x;
  EXCEPTION WHEN OTHERS THEN
    v_days_arr := ARRAY[]::int[];
  END;

  IF v_days_arr IS NULL OR NOT (v_dow = ANY(v_days_arr)) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'not_a_reserve_day', 'dow', v_dow);
  END IF;

  -- Idempotency: skip if we already reserved for this kode today
  SELECT COUNT(*) INTO v_exists
  FROM public.persuratan_nomor_diamankan
  WHERE kode_surat = v_kode AND tanggal_diamankan = v_today;

  IF v_exists > 0 THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'already_reserved_today', 'existing', v_exists);
  END IF;

  SELECT COALESCE(MAX(nomor_urut),0) INTO v_max_sk
  FROM public.surat_keluar WHERE kode_surat = v_kode;
  SELECT COALESCE(MAX(nomor_urut),0) INTO v_max_nd
  FROM public.persuratan_nomor_diamankan WHERE kode_surat = v_kode;

  v_next := GREATEST(v_max_sk, v_max_nd) + 1;

  FOR v_i IN 0 .. (v_count - 1) LOOP
    BEGIN
      INSERT INTO public.persuratan_nomor_diamankan (kode_surat, nomor_urut, tanggal_diamankan, status)
      VALUES (v_kode, v_next + v_i, v_today, 'tersedia');
      v_inserted := v_inserted + 1;
    EXCEPTION WHEN unique_violation THEN
      -- skip if already exists, try next
      NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'inserted', v_inserted, 'from', v_next, 'kode', v_kode, 'tanggal', v_today);
END;
$$;

REVOKE ALL ON FUNCTION public.auto_reserve_nomor_surat() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_reserve_nomor_surat() TO authenticated, service_role;

-- 3) Schedule daily via pg_cron (00:05 WIB = 17:05 UTC previous day)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('auto-reserve-nomor-surat');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'auto-reserve-nomor-surat',
  '5 17 * * *',
  $$ SELECT public.auto_reserve_nomor_surat(); $$
);
