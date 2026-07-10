// Katalog menu untuk fitur "Atur Akses Menu" pada Manajemen User.
// menu_key = URL path (tanpa leading slash) supaya konsisten dengan routing.

export type MenuLeaf = { key: string; label: string };
export type MenuGroup = { title: string; items: MenuLeaf[] };

export const MENU_CATALOG: MenuGroup[] = [
  {
    title: "Menu Utama",
    items: [
      { key: "dashboard", label: "Dashboard" },
      { key: "presensi", label: "Presensi" },
      { key: "laporan-presensi", label: "Laporan Presensi" },
      { key: "revisi-presensi", label: "Revisi Presensi" },
      { key: "keterlambatan", label: "Keterlambatan" },
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
      { key: "jadwal", label: "Jadwal Pelajaran" },
      { key: "denah", label: "Manajemen Denah" },
      { key: "hari-efektif", label: "Manajemen Hari Efektif" },
      { key: "notifikasi", label: "Manajemen Notifikasi" },
      { key: "periode", label: "Manajemen Periode" },
    ],
  },
  {
    title: "Pembelajaran",
    items: [
      { key: "berkas", label: "Berkas Pembelajaran" },
      { key: "pembelajaran/administrasi", label: "Administrasi Pembelajaran" },
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
      { key: "persuratan", label: "Persuratan" },
      { key: "sarpras", label: "Sarpras" },
      { key: "tpg", label: "TPG" },
      { key: "verval", label: "Verval Siswa" },
      { key: "mutasi", label: "Mutasi Siswa" },
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
      { key: "pengaturan", label: "Pengaturan" },
    ],
  },
];

export const ALL_MENU_KEYS = MENU_CATALOG.flatMap((g) => g.items.map((i) => i.key));

export const MENU_LABEL: Record<string, string> = Object.fromEntries(
  MENU_CATALOG.flatMap((g) => g.items.map((i) => [i.key, i.label])),
);
