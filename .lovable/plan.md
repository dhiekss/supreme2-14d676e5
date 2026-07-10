## Fitur Naik Kelas (Kenaikan Kelas)

Alur batch per rombel, memindahkan seluruh siswa ke rombel tujuan pada periode (tahun ajaran/semester) yang dipilih manual, dengan penanganan status naik / tinggal / lulus / keluar, dan menyimpan riwayat per siswa.

### 1. Database (migration)

Buat tabel baru `student_promotions` untuk audit trail:

- `student_id` (fk students)
- `student_name`, `student_nis` (snapshot)
- `rombel_asal_id`, `rombel_asal_name` (snapshot)
- `rombel_tujuan_id` (nullable — kosong untuk lulus/keluar)
- `tahun_ajaran_asal_id`, `tahun_ajaran_tujuan_id`
- `semester_asal_id`, `semester_tujuan_id`
- `status` enum: `naik` | `tinggal` | `lulus` | `keluar`
- `tanggal_proses`, `batch_id` (uuid — mengelompokkan satu proses batch)
- `catatan`
- `created_by`, `created_at`

Grants untuk `authenticated` + `service_role`, RLS aktif, policy: user login dapat SELECT/INSERT; UPDATE/DELETE hanya admin (via `has_role`).

### 2. Server functions (`src/lib/kenaikan.functions.ts`)

- `listRombelWithCounts` — daftar rombel + jumlah siswa aktif untuk pilih rombel asal.
- `listStudentsForPromotion({ rombel_id })` — siswa aktif di rombel asal (nama, nis, tanda sudah mutasi/keluar untuk default status).
- `previewPromotion({ rombel_asal_id })` — ambil siswa + default status per siswa (siswa yang punya baris di `student_resignations` / `student_transfers_out` → default `keluar`).
- `commitPromotion({ rombel_asal_id, rombel_tujuan_id, tahun_ajaran_tujuan_id, semester_tujuan_id, items: [{student_id, status, rombel_tujuan_override?}] })`:
  - Untuk status `naik` → update `students.rombel_id` = rombel_tujuan (atau override per siswa jika perlu).
  - Untuk `tinggal` → update ke `rombel_tujuan_override` (rombel tingkat sama tahun baru).
  - Untuk `lulus` / `keluar` → set `students.rombel_id = null` (dan tandai status jika kolom tersedia; jika tidak, cukup null).
  - Insert satu baris per siswa ke `student_promotions` dengan `batch_id` sama.
- `listPromotionHistory({ search?, batch_id? })` — daftar riwayat, dikelompokkan per batch.
- `undoPromotionBatch({ batch_id })` — admin only; balikkan `students.rombel_id` ke `rombel_asal_id` dan hapus baris batch.

### 3. UI — halaman baru `src/routes/_authenticated/kenaikan-kelas.tsx`

Tab: **Proses Kenaikan** | **Riwayat**.

**Tab Proses Kenaikan** (wizard 1 halaman):
1. Pilih **Rombel Asal**.
2. Pilih **Periode Tujuan**: `Tahun Ajaran` + `Semester` (select dari data periode yang ada).
3. Pilih **Rombel Tujuan default** (untuk siswa berstatus "naik").
4. Tabel siswa dengan kolom: Nama, NIS, Status (Select: Naik / Tinggal / Lulus / Keluar), Rombel Tujuan (auto-isi default; bisa override per siswa untuk kasus tinggal/naik lintas rombel).
5. Ringkasan: total naik / tinggal / lulus / keluar.
6. Tombol **Proses Kenaikan** → dialog konfirmasi → panggil `commitPromotion`.

Aturan default status:
- Siswa yang sudah punya baris di `student_transfers_out` atau `student_resignations` → default `keluar`, baris di-disable.
- Rombel asal tingkat XII → default semua `lulus`, rombel tujuan disembunyikan.
- Selain itu → default `naik`.

**Tab Riwayat**:
- Daftar batch (tanggal, rombel asal → tujuan, jumlah per status, oleh siapa).
- Klik batch → lihat detail siswa.
- Tombol **Undo** (admin only) per batch.

### 4. Integrasi menu

- Tambah entry di `src/lib/menu-catalog.ts` grup Kesiswaan/Akademik: "Kenaikan Kelas" → `/kenaikan-kelas`.
- Tambah link di `src/components/app-sidebar.tsx` jika perlu.
- Route ter-generate otomatis oleh TanStack Router setelah file route dibuat.

### 5. Catatan teknis

- Semua operasi via `createServerFn` + `requireSupabaseAuth`; tidak menyentuh `auth`/`storage` schema.
- Snapshot nama rombel/siswa disimpan di `student_promotions` supaya riwayat tetap terbaca meski rombel dihapus di kemudian hari.
- Tidak ada perubahan pada tabel `students` lain selain kolom `rombel_id` (diasumsikan tidak ada kolom status siswa; jika ada nanti kita tambahkan).
- Data saat ini (semester Genap 2025/2026) akan menjadi periode asal default di form.
