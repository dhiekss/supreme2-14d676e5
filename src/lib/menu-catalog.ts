// Katalog menu untuk fitur "Atur Akses Menu" pada Manajemen User.
// menu_key = URL path (tanpa leading slash) supaya konsisten dengan routing.

export type MenuLeaf = { key: string; label: string };
export type MenuGroup = { title: string; items: MenuLeaf[] };

export const MENU_CATALOG: MenuGroup[] = [
  {
    title: "Menu Utama",
    items: [
      { key: "dashboard", label: "Dashboard" },
      { key: "dashboard-guru", label: "Dashboard Guru" },
      { key: "dashboard-murid", label: "Dashboard Murid" },
      { key: "dashboard-kelas", label: "Dashboard Kelas" },
      { key: "dashboard-kakonli", label: "Dashboard Kakonli" },
      { key: "presensi", label: "Presensi" },
      { key: "presensi-kelompok", label: "Input Presensi Kelompok Belajar" },
      { key: "laporan-presensi", label: "Laporan Presensi" },
      { key: "revisi-presensi", label: "Revisi Presensi" },
      { key: "keterlambatan", label: "Input Keterlambatan" },
      { key: "laporan-keterlambatan", label: "Laporan Keterlambatan" },
      { key: "sp", label: "Surat Peringatan" },
    ],
  },
  {
    title: "Manajemen Sekolah",
    items: [
      { key: "rombel", label: "Manajemen Rombel" },
      { key: "rombel-khusus", label: "Rombel Khusus" },
      { key: "konsentrasi", label: "Konsentrasi Keahlian" },
      { key: "mapel", label: "Manajemen Mata Pelajaran" },
      { key: "guru", label: "Manajemen Guru" },
      { key: "tendik", label: "Manajemen Tendik" },
      { key: "jadwal", label: "Jadwal Pelajaran" },
      { key: "denah", label: "Manajemen Denah" },
      { key: "hari-efektif", label: "Manajemen Hari Efektif" },
      { key: "notifikasi", label: "Manajemen Notifikasi" },
      { key: "tahun-ajaran", label: "Tahun Ajaran" },
      { key: "semester", label: "Semester" },
    ],
  },
  {
    title: "Pembelajaran",
    items: [
      { key: "berkas", label: "Berkas Pembelajaran" },
      { key: "pembelajaran/administrasi", label: "Administrasi Pembelajaran" },
      { key: "pembelajaran/agenda-guru", label: "Agenda Guru" },
      { key: "pembelajaran/rekap-agenda-guru", label: "Rekap Agenda Guru" },
      { key: "pembelajaran/pengaturan", label: "Pengaturan Pembelajaran" },
      { key: "pembelajaran/nilai", label: "Pengelolaan Nilai" },
      { key: "pembelajaran/dashboard-nilai", label: "Dashboard Nilai" },
      { key: "pembelajaran/kbm", label: "Pelaksanaan KBM" },
      { key: "pembelajaran/rekap-kbm", label: "Rekap Pelaksanaan KBM" },
    ],
  },
  {
    title: "Operasional",
    items: [
      { key: "guru-izin", label: "Izin Guru" },
      { key: "perpus", label: "Perpustakaan" },
      { key: "persuratan/dashboard", label: "Dashboard Persuratan" },
      { key: "persuratan/surat-masuk", label: "Surat Masuk" },
      { key: "persuratan/surat-keluar", label: "Surat Keluar" },
      { key: "persuratan/surat-tugas", label: "Surat Tugas" },
      { key: "persuratan/disposisi", label: "Disposisi" },
      { key: "persuratan/arsip", label: "Arsip Surat" },
      { key: "persuratan/pengaturan", label: "Pengaturan Persuratan" },

      { key: "sarpras", label: "Sarpras" },
      { key: "tpg", label: "TPG" },
      { key: "verval", label: "Verval Murid" },
      { key: "mutasi", label: "Mutasi Murid" },
      { key: "kenaikan-kelas", label: "Kenaikan Kelas" },
      { key: "kbm", label: "KBM" },
    ],
  },
  {
    title: "Sistem",
    items: [
      { key: "master", label: "Master Data" },
      { key: "users", label: "Manajemen User" },
      { key: "aktivitas", label: "Aktivitas / Log" },
      { key: "import", label: "Impor Backup" },
      { key: "pengaturan/tampilan", label: "Pengaturan Tampilan" },
      { key: "pengaturan/storage", label: "Pengaturan Storage" },
      { key: "pengaturan/database", label: "Pengaturan Database" },
      { key: "pengaturan/analytics", label: "Pengaturan Analytics" },
    ],
  },
];

export const ALL_MENU_KEYS = MENU_CATALOG.flatMap((g) => g.items.map((i) => i.key));

export const MENU_LABEL: Record<string, string> = Object.fromEntries(
  MENU_CATALOG.flatMap((g) => g.items.map((i) => [i.key, i.label])),
);
