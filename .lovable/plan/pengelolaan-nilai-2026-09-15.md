# Pengelolaan Nilai

Membangun halaman **Pengelolaan Nilai** sesuai referensi, memakai data pembelajaran, murid, semester aktif, tujuan pembelajaran, dan nilai yang sudah tersedia.

## Hasil yang dibangun

- Filter berurutan untuk **Rombel**, **Mata Pelajaran**, dan **Nama Guru** dari penugasan pembelajaran.
- Empat tab: **Tujuan Pembelajaran**, **Final Test**, **Input Nilai**, dan **Rekap Nilai**.
- Pengelolaan tujuan pembelajaran: tambah, edit, hapus, salin dari rombel lain, model penilaian, bobot, dan tanggal rencana.
- Pengaturan aktif/nonaktif komponen penilaian sikap.
- Input nilai seluruh murid untuk setiap komponen, simpan sekaligus, serta impor nilai dari Excel.
- Pengaturan bobot komponen dengan pemeriksaan total 100%.
- Final Test dan rekap nilai per murid, termasuk nilai akhir berdasarkan bobot.
- Pembatasan data mengikuti akun masuk dan semester aktif, dengan admin tetap dapat memilih seluruh penugasan.

## Teknis

- Menambahkan fungsi server terautentikasi untuk membaca penugasan, murid, tujuan pembelajaran, dan nilai serta melakukan simpan/hapus/salin secara aman.
- Memakai tabel yang sudah ada: `rombel_mata_pelajaran`, `tujuan_pembelajaran`, `nilai_siswa`, `students`, dan `semester`.
- Menyimpan status komponen sikap pada pengaturan aplikasi tanpa membuat tabel baru.
- Mengganti halaman placeholder saat ini dan mempertahankan sistem tampilan serta komponen yang sudah digunakan aplikasi.
- Memastikan metadata halaman lengkap, kondisi kosong jelas, dan tampilan tetap nyaman pada layar kecil.
