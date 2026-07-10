-- SUPREME XPOES rebuild migration
CREATE TYPE public.app_role AS ENUM ('admin','wakasek','kaprog','guru','murid','admin_sarpras','admin_persuratan','admin_tpg');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  nip text,
  nis text,
  is_active boolean DEFAULT true,
  default_landing_page text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles read own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


CREATE TABLE public."rombel" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text,
  "created_at" timestamptz DEFAULT now(),
  "wali_kelas_name" text,
  "wali_kelas_nip" text,
  "konsentrasi_keahlian" text,
  "is_khusus" boolean,
  "tingkat" text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."rombel" TO authenticated;
GRANT ALL ON public."rombel" TO service_role;
ALTER TABLE public."rombel" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rombel_admin_all" ON public."rombel" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "rombel_auth_read" ON public."rombel" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."students" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text,
  "nis" text,
  "rombel_id" uuid,
  "created_at" timestamptz DEFAULT now(),
  "gender" text,
  "user_id" text,
  "nisn" text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."students" TO authenticated;
GRANT ALL ON public."students" TO service_role;
ALTER TABLE public."students" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students_admin_all" ON public."students" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "students_auth_read" ON public."students" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."guru" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nama" text,
  "nip" text,
  "jenis_kelamin" text,
  "mata_pelajaran_id" uuid,
  "kelompok_mapel" text,
  "kualifikasi_pendidikan" text,
  "created_at" timestamptz DEFAULT now(),
  "no_whatsapp" text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."guru" TO authenticated;
GRANT ALL ON public."guru" TO service_role;
ALTER TABLE public."guru" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guru_admin_all" ON public."guru" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "guru_auth_read" ON public."guru" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."mata_pelajaran" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "kode" text,
  "nama" text,
  "kelompok" text,
  "created_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."mata_pelajaran" TO authenticated;
GRANT ALL ON public."mata_pelajaran" TO service_role;
ALTER TABLE public."mata_pelajaran" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mata_pelajaran_admin_all" ON public."mata_pelajaran" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "mata_pelajaran_auth_read" ON public."mata_pelajaran" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."konsentrasi_keahlian" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text,
  "description" text,
  "created_at" timestamptz DEFAULT now(),
  "pejabat_id" uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."konsentrasi_keahlian" TO authenticated;
GRANT ALL ON public."konsentrasi_keahlian" TO service_role;
ALTER TABLE public."konsentrasi_keahlian" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "konsentrasi_keahlian_admin_all" ON public."konsentrasi_keahlian" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "konsentrasi_keahlian_auth_read" ON public."konsentrasi_keahlian" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."semester" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tahun_ajaran_id" uuid,
  "nama" text,
  "tanggal_mulai" date,
  "tanggal_selesai" date,
  "is_active" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."semester" TO authenticated;
GRANT ALL ON public."semester" TO service_role;
ALTER TABLE public."semester" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "semester_admin_all" ON public."semester" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "semester_auth_read" ON public."semester" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."tahun_ajaran" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nama" text,
  "tanggal_mulai" date,
  "tanggal_selesai" date,
  "is_active" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."tahun_ajaran" TO authenticated;
GRANT ALL ON public."tahun_ajaran" TO service_role;
ALTER TABLE public."tahun_ajaran" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tahun_ajaran_admin_all" ON public."tahun_ajaran" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "tahun_ajaran_auth_read" ON public."tahun_ajaran" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."rombel_mata_pelajaran" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rombel_id" uuid,
  "mata_pelajaran_id" uuid,
  "guru_id" uuid,
  "created_at" timestamptz DEFAULT now(),
  "created_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  "semester_id" uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."rombel_mata_pelajaran" TO authenticated;
GRANT ALL ON public."rombel_mata_pelajaran" TO service_role;
ALTER TABLE public."rombel_mata_pelajaran" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rombel_mata_pelajaran_admin_all" ON public."rombel_mata_pelajaran" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "rombel_mata_pelajaran_auth_read" ON public."rombel_mata_pelajaran" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."berkas_pembelajaran" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rombel_mata_pelajaran_id" uuid,
  "guru_id" uuid,
  "prota_promes_link" text,
  "atp_link" text,
  "modul_ajar_link" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "created_by" uuid,
  "status" text,
  "catatan_perbaikan" text,
  "prota_link" text,
  "promes_link" text,
  "catatan_oleh" uuid,
  "catatan_oleh_nama" text,
  "diperiksa_oleh" uuid,
  "diperiksa_oleh_nama" text,
  "diperiksa_at" timestamptz,
  "semester_id" uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."berkas_pembelajaran" TO authenticated;
GRANT ALL ON public."berkas_pembelajaran" TO service_role;
ALTER TABLE public."berkas_pembelajaran" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "berkas_pembelajaran_admin_all" ON public."berkas_pembelajaran" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "berkas_pembelajaran_auth_read" ON public."berkas_pembelajaran" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."hari_efektif" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tanggal" date,
  "jenis" text,
  "keterangan" text,
  "created_at" timestamptz DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."hari_efektif" TO authenticated;
GRANT ALL ON public."hari_efektif" TO service_role;
ALTER TABLE public."hari_efektif" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hari_efektif_admin_all" ON public."hari_efektif" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "hari_efektif_auth_read" ON public."hari_efektif" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."jadwal_pelajaran" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rombel_id" uuid,
  "mata_pelajaran_id" uuid,
  "guru_id" uuid,
  "hari" text,
  "jam_ke" bigint,
  "jam_mulai" text,
  "jam_selesai" text,
  "created_at" timestamptz DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."jadwal_pelajaran" TO authenticated;
GRANT ALL ON public."jadwal_pelajaran" TO service_role;
ALTER TABLE public."jadwal_pelajaran" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jadwal_pelajaran_admin_all" ON public."jadwal_pelajaran" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "jadwal_pelajaran_auth_read" ON public."jadwal_pelajaran" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."jadwal_alokasi_waktu" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "hari" text,
  "jam_ke" bigint,
  "jam_mulai" time,
  "jam_selesai" time,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "created_by" uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."jadwal_alokasi_waktu" TO authenticated;
GRANT ALL ON public."jadwal_alokasi_waktu" TO service_role;
ALTER TABLE public."jadwal_alokasi_waktu" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jadwal_alokasi_waktu_admin_all" ON public."jadwal_alokasi_waktu" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "jadwal_alokasi_waktu_auth_read" ON public."jadwal_alokasi_waktu" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."tujuan_pembelajaran" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rombel_mata_pelajaran_id" uuid,
  "kode_tp" text,
  "deskripsi" text,
  "model_penilaian" text,
  "urutan" bigint,
  "is_active" boolean DEFAULT true,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "komponen_type" text,
  "bobot" bigint,
  "tanggal_rencana_penilaian" date,
  "semester_id" uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."tujuan_pembelajaran" TO authenticated;
GRANT ALL ON public."tujuan_pembelajaran" TO service_role;
ALTER TABLE public."tujuan_pembelajaran" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tujuan_pembelajaran_admin_all" ON public."tujuan_pembelajaran" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "tujuan_pembelajaran_auth_read" ON public."tujuan_pembelajaran" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."nilai_siswa" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tujuan_pembelajaran_id" uuid,
  "student_id" uuid,
  "nilai" numeric,
  "catatan" text,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "semester_id" uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."nilai_siswa" TO authenticated;
GRANT ALL ON public."nilai_siswa" TO service_role;
ALTER TABLE public."nilai_siswa" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nilai_siswa_admin_all" ON public."nilai_siswa" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "nilai_siswa_auth_read" ON public."nilai_siswa" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."attendance_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "date" date,
  "rombel_id" uuid,
  "officer_name" text,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  "semester_id" uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."attendance_records" TO authenticated;
GRANT ALL ON public."attendance_records" TO service_role;
ALTER TABLE public."attendance_records" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_records_admin_all" ON public."attendance_records" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "attendance_records_auth_read" ON public."attendance_records" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."attendance_details" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "attendance_record_id" uuid,
  "student_id" uuid,
  "status" text,
  "created_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."attendance_details" TO authenticated;
GRANT ALL ON public."attendance_details" TO service_role;
ALTER TABLE public."attendance_details" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_details_admin_all" ON public."attendance_details" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "attendance_details_auth_read" ON public."attendance_details" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."attendance_revision_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "attendance_detail_id" uuid,
  "student_id" uuid,
  "rombel_id" uuid,
  "attendance_date" date,
  "original_status" text,
  "requested_status" text,
  "alasan" text,
  "status" text,
  "requested_by" uuid,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "rejection_reason" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."attendance_revision_requests" TO authenticated;
GRANT ALL ON public."attendance_revision_requests" TO service_role;
ALTER TABLE public."attendance_revision_requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_revision_requests_admin_all" ON public."attendance_revision_requests" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "attendance_revision_requests_auth_read" ON public."attendance_revision_requests" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."kbm_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tanggal" date,
  "rombel_id" uuid,
  "guru_id" uuid,
  "mata_pelajaran_id" uuid,
  "jam_pelajaran" jsonb,
  "status" text,
  "ttd_pelapor" text,
  "foto_kegiatan" text,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  "jam_pelajaran_status" jsonb,
  "semester_id" uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."kbm_records" TO authenticated;
GRANT ALL ON public."kbm_records" TO service_role;
ALTER TABLE public."kbm_records" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kbm_records_admin_all" ON public."kbm_records" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "kbm_records_auth_read" ON public."kbm_records" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."kbm_agenda" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tanggal" date,
  "rombel_id" uuid,
  "mata_pelajaran_id" uuid,
  "guru_id" uuid,
  "jam_ke" bigint,
  "tujuan_pembelajaran_id" uuid,
  "materi_detail" text,
  "foto_dokumentasi" text,
  "ttd_guru" text,
  "guru_status" text,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "semester_id" uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."kbm_agenda" TO authenticated;
GRANT ALL ON public."kbm_agenda" TO service_role;
ALTER TABLE public."kbm_agenda" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kbm_agenda_admin_all" ON public."kbm_agenda" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "kbm_agenda_auth_read" ON public."kbm_agenda" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."kbm_agenda_kehadiran" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "kbm_agenda_id" uuid,
  "student_id" uuid,
  "status" text,
  "created_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."kbm_agenda_kehadiran" TO authenticated;
GRANT ALL ON public."kbm_agenda_kehadiran" TO service_role;
ALTER TABLE public."kbm_agenda_kehadiran" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kbm_agenda_kehadiran_admin_all" ON public."kbm_agenda_kehadiran" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "kbm_agenda_kehadiran_auth_read" ON public."kbm_agenda_kehadiran" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."late_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "student_id" uuid,
  "rombel_id" uuid,
  "recorded_at" timestamptz,
  "recorded_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  "record_date" date,
  "semester_id" uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."late_records" TO authenticated;
GRANT ALL ON public."late_records" TO service_role;
ALTER TABLE public."late_records" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "late_records_admin_all" ON public."late_records" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "late_records_auth_read" ON public."late_records" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."sp_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "student_id" uuid,
  "sp_level" bigint,
  "alasan" text,
  "jumlah_alfa" bigint,
  "jumlah_terlambat" bigint,
  "dokumen_pendukung" text,
  "foto_kegiatan" text,
  "tanggal_rekaman" date,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."sp_records" TO authenticated;
GRANT ALL ON public."sp_records" TO service_role;
ALTER TABLE public."sp_records" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_records_admin_all" ON public."sp_records" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "sp_records_auth_read" ON public."sp_records" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."guru_izin" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "guru_id" uuid,
  "user_id" uuid,
  "tanggal_mulai" date,
  "tanggal_selesai" date,
  "jenis_izin" text,
  "alasan" text,
  "status" text,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "catatan_admin" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."guru_izin" TO authenticated;
GRANT ALL ON public."guru_izin" TO service_role;
ALTER TABLE public."guru_izin" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guru_izin_admin_all" ON public."guru_izin" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "guru_izin_auth_read" ON public."guru_izin" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."guru_izin_tugas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "guru_izin_id" uuid,
  "rombel_id" uuid,
  "mata_pelajaran_id" uuid,
  "jam_ke" jsonb,
  "deskripsi_tugas" text,
  "file_tugas" text,
  "tanggal" date,
  "created_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."guru_izin_tugas" TO authenticated;
GRANT ALL ON public."guru_izin_tugas" TO service_role;
ALTER TABLE public."guru_izin_tugas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guru_izin_tugas_admin_all" ON public."guru_izin_tugas" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "guru_izin_tugas_auth_read" ON public."guru_izin_tugas" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."student_transfers_out" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "student_id" uuid,
  "rombel_id" uuid,
  "tanggal_diterima_tujuan" date,
  "tanggal_surat_pindah" date,
  "sekolah_tujuan" text,
  "file_surat" text,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  "student_name" text,
  "student_nis" text,
  "dapodik_status" text,
  "dapodik_tanggal" date
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."student_transfers_out" TO authenticated;
GRANT ALL ON public."student_transfers_out" TO service_role;
ALTER TABLE public."student_transfers_out" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_transfers_out_admin_all" ON public."student_transfers_out" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "student_transfers_out_auth_read" ON public."student_transfers_out" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."student_rombel_transfers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "student_id" uuid,
  "rombel_asal_id" uuid,
  "rombel_tujuan_id" uuid,
  "alasan" text,
  "tanggal_pindah" date,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  "dapodik_status" text,
  "dapodik_tanggal" date
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."student_rombel_transfers" TO authenticated;
GRANT ALL ON public."student_rombel_transfers" TO service_role;
ALTER TABLE public."student_rombel_transfers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_rombel_transfers_admin_all" ON public."student_rombel_transfers" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "student_rombel_transfers_auth_read" ON public."student_rombel_transfers" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."student_resignations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "student_id" uuid,
  "rombel_id" uuid,
  "tanggal_surat" date,
  "alasan" text,
  "file_surat" text,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  "student_name" text,
  "student_nis" text,
  "dapodik_status" text,
  "dapodik_tanggal" date
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."student_resignations" TO authenticated;
GRANT ALL ON public."student_resignations" TO service_role;
ALTER TABLE public."student_resignations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_resignations_admin_all" ON public."student_resignations" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "student_resignations_auth_read" ON public."student_resignations" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."user_rombel" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "rombel_id" uuid,
  "created_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_rombel" TO authenticated;
GRANT ALL ON public."user_rombel" TO service_role;
ALTER TABLE public."user_rombel" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_rombel_admin_all" ON public."user_rombel" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "user_rombel_auth_read" ON public."user_rombel" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."user_menu_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "menu_key" text,
  "created_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_menu_permissions" TO authenticated;
GRANT ALL ON public."user_menu_permissions" TO service_role;
ALTER TABLE public."user_menu_permissions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_menu_permissions_admin_all" ON public."user_menu_permissions" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "user_menu_permissions_auth_read" ON public."user_menu_permissions" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."user_presence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "last_seen_at" timestamptz,
  "is_online" boolean,
  "created_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_presence" TO authenticated;
GRANT ALL ON public."user_presence" TO service_role;
ALTER TABLE public."user_presence" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_presence_admin_all" ON public."user_presence" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "user_presence_auth_read" ON public."user_presence" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."books" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "judul" text,
  "penulis" text,
  "jenis_buku" text,
  "jumlah_tersedia" bigint,
  "created_at" timestamptz DEFAULT now(),
  "created_by" uuid,
  "isbn" text,
  "tahun_pengadaan" bigint
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."books" TO authenticated;
GRANT ALL ON public."books" TO service_role;
ALTER TABLE public."books" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books_admin_all" ON public."books" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "books_auth_read" ON public."books" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."book_copies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "book_id" uuid,
  "copy_number" bigint,
  "barcode" text,
  "status" text,
  "created_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."book_copies" TO authenticated;
GRANT ALL ON public."book_copies" TO service_role;
ALTER TABLE public."book_copies" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "book_copies_admin_all" ON public."book_copies" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "book_copies_auth_read" ON public."book_copies" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."book_loans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "borrower_type" text,
  "borrower_id" uuid,
  "borrower_name" text,
  "rombel_id" uuid,
  "book_ids" jsonb,
  "tanggal_peminjaman" date,
  "status" text,
  "tanggal_pengembalian" date,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  "book_copy_ids" jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."book_loans" TO authenticated;
GRANT ALL ON public."book_loans" TO service_role;
ALTER TABLE public."book_loans" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "book_loans_admin_all" ON public."book_loans" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "book_loans_auth_read" ON public."book_loans" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."sarpras_ruang" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nama" text,
  "kapasitas" bigint,
  "created_at" timestamptz DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now(),
  "kode_ruang" text,
  "rombel_id" uuid,
  "denah_posisi_x" numeric,
  "denah_posisi_y" numeric,
  "jenis_ruang_id" uuid,
  "denah_marker_size" numeric
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."sarpras_ruang" TO authenticated;
GRANT ALL ON public."sarpras_ruang" TO service_role;
ALTER TABLE public."sarpras_ruang" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sarpras_ruang_admin_all" ON public."sarpras_ruang" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "sarpras_ruang_auth_read" ON public."sarpras_ruang" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."sarpras_jenis_ruang" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nama" text,
  "keterangan" text,
  "is_kelas" boolean,
  "created_at" timestamptz DEFAULT now(),
  "created_by" uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."sarpras_jenis_ruang" TO authenticated;
GRANT ALL ON public."sarpras_jenis_ruang" TO service_role;
ALTER TABLE public."sarpras_jenis_ruang" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sarpras_jenis_ruang_admin_all" ON public."sarpras_jenis_ruang" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "sarpras_jenis_ruang_auth_read" ON public."sarpras_jenis_ruang" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."sarpras_pengajuan" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nama" text,
  "jenis" text,
  "quantity" bigint,
  "satuan" text,
  "perkiraan_harga" bigint,
  "total_harga" bigint,
  "link_referensi" text,
  "keperluan" text,
  "status" text,
  "pengaju_id" uuid,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "catatan_penolakan" text,
  "approved_by" uuid,
  "approved_at" timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."sarpras_pengajuan" TO authenticated;
GRANT ALL ON public."sarpras_pengajuan" TO service_role;
ALTER TABLE public."sarpras_pengajuan" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sarpras_pengajuan_admin_all" ON public."sarpras_pengajuan" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "sarpras_pengajuan_auth_read" ON public."sarpras_pengajuan" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."admin_sarpras" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "created_at" timestamptz DEFAULT now(),
  "created_by" uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."admin_sarpras" TO authenticated;
GRANT ALL ON public."admin_sarpras" TO service_role;
ALTER TABLE public."admin_sarpras" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_sarpras_admin_all" ON public."admin_sarpras" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin_sarpras_auth_read" ON public."admin_sarpras" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."surat_keluar" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nomor_surat" text,
  "tujuan" text,
  "tanggal_surat" date,
  "perihal" text,
  "jenis_surat" text,
  "sifat_surat" text,
  "isi_ringkas" text,
  "file_url" text,
  "pembuat_id" uuid,
  "penandatangan_id" uuid,
  "status" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."surat_keluar" TO authenticated;
GRANT ALL ON public."surat_keluar" TO service_role;
ALTER TABLE public."surat_keluar" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "surat_keluar_admin_all" ON public."surat_keluar" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "surat_keluar_auth_read" ON public."surat_keluar" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."surat_tugas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nomor_surat" text,
  "jenis" text,
  "tanggal_mulai" date,
  "tanggal_selesai" date,
  "tujuan_lokasi" text,
  "keperluan" text,
  "file_surat_tugas_url" text,
  "file_sppd_url" text,
  "pembuat_id" uuid,
  "status" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "kode_kegiatan" text,
  "kode_ring" text,
  "dasar_surat_ada" boolean,
  "nomor_dasar_surat" text,
  "tanggal_dasar_surat" date,
  "perihal_dasar_surat" text,
  "kendaraan" text,
  "waktu_berangkat" time,
  "instansi_dasar_surat" text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."surat_tugas" TO authenticated;
GRANT ALL ON public."surat_tugas" TO service_role;
ALTER TABLE public."surat_tugas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "surat_tugas_admin_all" ON public."surat_tugas" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "surat_tugas_auth_read" ON public."surat_tugas" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."surat_tugas_peserta" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "surat_tugas_id" uuid,
  "nama_peserta" text,
  "jabatan" text,
  "nip" text,
  "created_at" timestamptz DEFAULT now(),
  "pangkat_golongan" text,
  "urutan" bigint,
  "is_utama" boolean
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."surat_tugas_peserta" TO authenticated;
GRANT ALL ON public."surat_tugas_peserta" TO service_role;
ALTER TABLE public."surat_tugas_peserta" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "surat_tugas_peserta_admin_all" ON public."surat_tugas_peserta" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "surat_tugas_peserta_auth_read" ON public."surat_tugas_peserta" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."persuratan_kode_surat" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "kode" text,
  "nama" text,
  "keterangan" text,
  "urutan" bigint,
  "is_active" boolean DEFAULT true,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."persuratan_kode_surat" TO authenticated;
GRANT ALL ON public."persuratan_kode_surat" TO service_role;
ALTER TABLE public."persuratan_kode_surat" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "persuratan_kode_surat_admin_all" ON public."persuratan_kode_surat" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "persuratan_kode_surat_auth_read" ON public."persuratan_kode_surat" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."persuratan_nomor_surat" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "jenis_surat" text,
  "format_nomor" text,
  "prefix" text,
  "counter" bigint,
  "tahun" bigint,
  "contoh_hasil" text,
  "is_active" boolean DEFAULT true,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."persuratan_nomor_surat" TO authenticated;
GRANT ALL ON public."persuratan_nomor_surat" TO service_role;
ALTER TABLE public."persuratan_nomor_surat" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "persuratan_nomor_surat_admin_all" ON public."persuratan_nomor_surat" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "persuratan_nomor_surat_auth_read" ON public."persuratan_nomor_surat" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."persuratan_kop_surat" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nama" text,
  "file_url" text,
  "is_active" boolean DEFAULT true,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."persuratan_kop_surat" TO authenticated;
GRANT ALL ON public."persuratan_kop_surat" TO service_role;
ALTER TABLE public."persuratan_kop_surat" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "persuratan_kop_surat_admin_all" ON public."persuratan_kop_surat" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "persuratan_kop_surat_auth_read" ON public."persuratan_kop_surat" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."persuratan_pengaturan_umum" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" text,
  "value" text,
  "deskripsi" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."persuratan_pengaturan_umum" TO authenticated;
GRANT ALL ON public."persuratan_pengaturan_umum" TO service_role;
ALTER TABLE public."persuratan_pengaturan_umum" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "persuratan_pengaturan_umum_admin_all" ON public."persuratan_pengaturan_umum" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "persuratan_pengaturan_umum_auth_read" ON public."persuratan_pengaturan_umum" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."admin_persuratan" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."admin_persuratan" TO authenticated;
GRANT ALL ON public."admin_persuratan" TO service_role;
ALTER TABLE public."admin_persuratan" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_persuratan_admin_all" ON public."admin_persuratan" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin_persuratan_auth_read" ON public."admin_persuratan" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."admin_tpg" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "created_at" timestamptz DEFAULT now(),
  "created_by" uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."admin_tpg" TO authenticated;
GRANT ALL ON public."admin_tpg" TO service_role;
ALTER TABLE public."admin_tpg" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_tpg_admin_all" ON public."admin_tpg" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin_tpg_auth_read" ON public."admin_tpg" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."referensi_tpg" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "guru_id" uuid,
  "pangkat_golongan" text,
  "besaran_pajak" bigint,
  "gaji_pokok" bigint,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "created_by" uuid,
  "besaran_bpjs" bigint
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."referensi_tpg" TO authenticated;
GRANT ALL ON public."referensi_tpg" TO service_role;
ALTER TABLE public."referensi_tpg" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referensi_tpg_admin_all" ON public."referensi_tpg" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "referensi_tpg_auth_read" ON public."referensi_tpg" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."laporan_tpg" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "referensi_tpg_id" uuid,
  "guru_id" uuid,
  "bulan" bigint,
  "tahun" bigint,
  "nominal_diterima" bigint,
  "bukti_transfer_url" text,
  "created_at" timestamptz DEFAULT now(),
  "created_by" uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."laporan_tpg" TO authenticated;
GRANT ALL ON public."laporan_tpg" TO service_role;
ALTER TABLE public."laporan_tpg" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "laporan_tpg_admin_all" ON public."laporan_tpg" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "laporan_tpg_auth_read" ON public."laporan_tpg" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."tpg_administrasi" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "laporan_tpg_id" uuid,
  "guru_id" uuid,
  "bulan" bigint,
  "tahun" bigint,
  "sudah_administrasi" boolean,
  "nominal_iuran" bigint,
  "tanggal_administrasi" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "created_by" uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."tpg_administrasi" TO authenticated;
GRANT ALL ON public."tpg_administrasi" TO service_role;
ALTER TABLE public."tpg_administrasi" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tpg_administrasi_admin_all" ON public."tpg_administrasi" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "tpg_administrasi_auth_read" ON public."tpg_administrasi" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."tpg_penyerahan_iuran" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "bulan" bigint,
  "tahun" bigint,
  "keperluan" text,
  "nominal" bigint,
  "tanggal_penyerahan" date,
  "created_at" timestamptz DEFAULT now(),
  "created_by" uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."tpg_penyerahan_iuran" TO authenticated;
GRANT ALL ON public."tpg_penyerahan_iuran" TO service_role;
ALTER TABLE public."tpg_penyerahan_iuran" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tpg_penyerahan_iuran_admin_all" ON public."tpg_penyerahan_iuran" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "tpg_penyerahan_iuran_auth_read" ON public."tpg_penyerahan_iuran" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."tpg_periode_aktif" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "bulan" bigint,
  "tahun" bigint,
  "is_active" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT now(),
  "created_by" uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."tpg_periode_aktif" TO authenticated;
GRANT ALL ON public."tpg_periode_aktif" TO service_role;
ALTER TABLE public."tpg_periode_aktif" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tpg_periode_aktif_admin_all" ON public."tpg_periode_aktif" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "tpg_periode_aktif_auth_read" ON public."tpg_periode_aktif" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."suara_publik" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "token" text,
  "nama_pengirim" text,
  "email_pengirim" text,
  "peran_pengirim" text,
  "user_id" uuid,
  "kategori" text,
  "judul" text,
  "isi" text,
  "status" text,
  "is_anonymous" boolean,
  "tanggapan_admin" text,
  "moderated_by" uuid,
  "moderated_at" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."suara_publik" TO authenticated;
GRANT ALL ON public."suara_publik" TO service_role;
ALTER TABLE public."suara_publik" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suara_publik_admin_all" ON public."suara_publik" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "suara_publik_auth_read" ON public."suara_publik" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."verval_siswa" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "student_id" uuid,
  "semester_id" uuid,
  "nisn" text,
  "tempat_lahir" text,
  "tanggal_lahir" date,
  "agama" text,
  "nama_ayah" text,
  "nama_ibu" text,
  "status" text,
  "catatan_perbaikan" text,
  "data_perbaikan" jsonb,
  "akte_kelahiran_url" text,
  "kk_url" text,
  "ijazah_sd_url" text,
  "ijazah_smp_url" text,
  "validated_by" uuid,
  "validated_at" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "created_by" uuid,
  "nama_perbaikan" text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."verval_siswa" TO authenticated;
GRANT ALL ON public."verval_siswa" TO service_role;
ALTER TABLE public."verval_siswa" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verval_siswa_admin_all" ON public."verval_siswa" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "verval_siswa_auth_read" ON public."verval_siswa" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."app_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" text,
  "value" text,
  "description" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."app_settings" TO authenticated;
GRANT ALL ON public."app_settings" TO service_role;
ALTER TABLE public."app_settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings_admin_all" ON public."app_settings" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "app_settings_auth_read" ON public."app_settings" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."activity_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "user_email" text,
  "user_full_name" text,
  "action" text,
  "description" text,
  "metadata" jsonb,
  "ip_address" text,
  "created_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."activity_logs" TO authenticated;
GRANT ALL ON public."activity_logs" TO service_role;
ALTER TABLE public."activity_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_logs_admin_all" ON public."activity_logs" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "activity_logs_auth_read" ON public."activity_logs" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."backup_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" timestamptz DEFAULT now(),
  "action_type" text,
  "performed_by" uuid,
  "file_name" text,
  "file_size_bytes" bigint,
  "tables_included" jsonb,
  "records_count" jsonb,
  "status" text,
  "error_message" text,
  "notes" text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."backup_logs" TO authenticated;
GRANT ALL ON public."backup_logs" TO service_role;
ALTER TABLE public."backup_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "backup_logs_admin_all" ON public."backup_logs" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "backup_logs_auth_read" ON public."backup_logs" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."notification_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" text,
  "recipient_phone" text,
  "recipient_name" text,
  "message" text,
  "status" text,
  "response_data" jsonb,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."notification_logs" TO authenticated;
GRANT ALL ON public."notification_logs" TO service_role;
ALTER TABLE public."notification_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_logs_admin_all" ON public."notification_logs" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "notification_logs_auth_read" ON public."notification_logs" FOR SELECT TO authenticated USING (true);

CREATE TABLE public."kurator_pembelajaran" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "created_at" timestamptz DEFAULT now(),
  "created_by" uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."kurator_pembelajaran" TO authenticated;
GRANT ALL ON public."kurator_pembelajaran" TO service_role;
ALTER TABLE public."kurator_pembelajaran" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kurator_pembelajaran_admin_all" ON public."kurator_pembelajaran" FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "kurator_pembelajaran_auth_read" ON public."kurator_pembelajaran" FOR SELECT TO authenticated USING (true);