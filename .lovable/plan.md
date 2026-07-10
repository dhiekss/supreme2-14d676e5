## Ringkasan

Membangun ulang aplikasi **SUPREME XPOES** (Students Presence and Management of Education) SMKN 1 Pusakanagara berdasarkan backup JSON (79 tabel, ±226k baris) dan screenshot UI. Iterasi pertama fokus ke modul prioritas (Presensi + KBM) plus seluruh master data yang dibutuhkan. Modul lain (perpustakaan, sarpras, persuratan, TPG, verval, surat tugas, suara publik, dll.) menyusul di iterasi berikutnya — datanya tetap diimpor agar tidak hilang.

## Cakupan iterasi pertama (yang akan dibangun sekarang)

**Auth & Role**
- Login email/NIP/NIS + password (sesuai screenshot)
- Tabel `profiles` + `user_roles` (enum `app_role`: admin, wakasek, kaprog, guru, murid, + role tambahan dari data: admin_sarpras, admin_persuratan, admin_tpg)
- Layout `_authenticated` dengan sidebar (Halaman Utama, Dashboard Guru/Murid/Kelas/Ka.Prog, Pembelajaran, Nilai PSAJ, Kelulusan, PKL, Buku Induk, Input Presensi, Laporan Presensi, Revisi Presensi, Input KBM, Laporan KBM, Keluar)
- Brand: nama "SUPREME XPOES", logo SMKN 1 Pusakanagara, palet biru tua (#1e3a8a-ish) sesuai screenshot, font sans-serif yang bersih

**Halaman Utama (Dashboard Admin)**
- Card statistik: Jumlah Guru, Jumlah Murid, Jumlah Rombel, Kehadiran Hari Ini
- Card per tingkat: Kelas X / XI / XII (L/P)
- Grafik mingguan presensi murid (stacked bar Hadir/Izin/Sakit/Alfa/PKL)
- Card Data KBM Guru (realisasi %), Keterlambatan Murid, Notifikasi Penting (Alfa 3+ hari, Kasus SP)

**Master Data (CRUD untuk Admin/Kaprog, read-only untuk role lain)**
- `tahun_ajaran`, `semester` (set semester aktif)
- `konsentrasi_keahlian` (jurusan)
- `rombel` (kelas) + wali kelas
- `mata_pelajaran`
- `guru`, `students`
- `jadwal_pelajaran`, `jadwal_alokasi_waktu`, `hari_efektif`
- `rombel_mata_pelajaran` (mapping guru-rombel-mapel per semester)

**Modul Presensi**
- Input Presensi Harian: pilih tanggal + rombel → daftar siswa → status (Hadir/Izin/Sakit/Alfa/PKL)
- Laporan Presensi: filter rombel + rentang tanggal, ekspor
- Revisi Presensi: alur request → approve/reject (sesuai `attendance_revision_requests`)
- Pencatatan keterlambatan (`late_records`)
- Pencatatan Surat Peringatan (`sp_records`) untuk siswa Alfa 3+

**Modul KBM**
- Input KBM: tanggal, rombel, mapel, jam pelajaran (1–10), materi, foto kegiatan, TTD pelapor (signature canvas)
- KBM Agenda + kehadiran per pertemuan (`kbm_agenda`, `kbm_agenda_kehadiran`)
- Laporan KBM: rekap realisasi per guru/rombel/mapel
- Berkas pembelajaran (`berkas_pembelajaran`): upload Prota/Promes/ATP/Modul Ajar dengan alur validasi

**Impor data dari backup JSON**
- Script Node/TypeScript dijalankan via `createServerFn` admin-only memakai `supabaseAdmin`
- Urutan: tahun_ajaran → semester → konsentrasi → rombel → mata_pelajaran → guru → students → profiles → user_roles → user_rombel → jadwal → rombel_mata_pelajaran → tujuan_pembelajaran → attendance_records/details → kbm_records/agenda/kehadiran → late_records → sp_records → hari_efektif
- Tabel di luar MVP (books, sarpras, surat, tpg, verval, dll.) dibuat skemanya saja & data diimpor (tanpa UI dulu) supaya tidak hilang
- Password user tidak ada di backup → admin reset / generate password awal (NIP untuk guru, NIS untuk murid) dan kirim via daftar download

## Stack & teknis

- **Frontend**: TanStack Start v1 + React 19, Tailwind v4, shadcn/ui, lucide-react, recharts (grafik dashboard), react-signature-canvas (TTD)
- **Backend**: Lovable Cloud (Supabase) — Postgres + Auth + Storage (foto kegiatan, file berkas, file surat)
- **Akses data**: `createServerFn` + RLS (`requireSupabaseAuth`); admin job pakai `supabaseAdmin` di `.handler()`
- **Routing**: `src/routes/_authenticated/*` (gate `ssr: false`), `src/routes/auth.tsx`
- **RLS**: function `has_role(uuid, app_role)` security definer; policy per tabel berdasarkan role + scoping per rombel (guru hanya rombel yang diajar, murid hanya datanya sendiri)
- **Storage buckets**: `kbm-foto`, `berkas-pembelajaran`, `sp-dokumen`, `verval-dokumen`, `surat-files` (private + signed URL)

## Tidak masuk iterasi ini (menyusul)

UI untuk: Perpustakaan (books/loans), Sarpras (alat/ruang/peminjaman/pengajuan), Persuratan (surat masuk/keluar/tugas/disposisi/arsip), TPG (referensi/laporan/administrasi), Verval Siswa, Suara Publik, Mutasi (transfers in/out, resignations, rombel transfers), Buku Induk lengkap, Nilai PSAJ, Kelulusan, PKL. Skemanya tetap dibuat & datanya tetap diimpor.

## Tahapan kerja

1. Enable Lovable Cloud
2. Setup design system (tokens warna SUPREME, font, logo, layout sidebar)
3. Migrasi skema: enum + tabel master + tabel presensi + tabel KBM + tabel-tabel sisa (skema saja)
4. RLS + grants + function `has_role`
5. Auth pages + layout `_authenticated`
6. Halaman master data (CRUD)
7. Halaman Presensi (input, laporan, revisi, keterlambatan, SP)
8. Halaman KBM (input, agenda, laporan, berkas)
9. Dashboard Halaman Utama + Dashboard Guru/Murid/Kelas/Kaprog
10. Script impor data dari backup JSON → jalankan
11. QA: login sebagai admin/guru/murid sample, cek dashboard & alur presensi/KBM

## Pertanyaan terbuka (akan saya tangani saat eksekusi, beritahu kalau Anda punya preferensi)

- **Password awal user**: pakai pola default (NIP untuk guru, NIS untuk murid, `admin12345` untuk admin lama) atau Anda mau set manual?
- **File storage**: backup JSON tidak menyertakan binary file (foto kegiatan, file surat, dll.). URL lama tetap disimpan tapi file aslinya tidak ikut. OK?
- **Domain custom**: setelah selesai, apakah mau dipasang ulang ke `supreme.smknpusakanagara.sch.id` (perlu update DNS)?
