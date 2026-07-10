# Pengaturan Menu Sidebar

Menu baru **Pengaturan → Pengaturan Menu** untuk admin mengatur susunan sidebar per role.

## Yang bisa diatur admin

- **Urutan**: drag & drop item menu dan grup.
- **Sembunyikan/tampilkan**: toggle visibility per item.
- **Ganti nama**: ubah label item/grup.
- **Pindah antar grup**: menu leaf bisa dipindah ke grup lain, atau dijadikan menu top-level (tanpa grup).
- **Cakupan per role**: konfigurasi terpisah untuk `admin`, `moderator`, `user` (mengikuti enum `app_role` yang sudah ada).

## Struktur menu di database

Satu row per role menyimpan layout sebagai JSON:

```text
[
  { "kind": "leaf",  "key": "dashboard",  "label": "Dashboard", "hidden": false },
  { "kind": "group", "id": "presensi",    "label": "Presensi",  "hidden": false,
    "children": [
      { "key": "presensi",         "label": "Input Presensi",   "hidden": false },
      { "key": "laporan-presensi", "label": "Laporan Presensi", "hidden": false }
    ]
  }
]
```

`key` (leaf) dan `id` (group) memakai identitas stabil dari katalog default agar
tetap mengenali item saat ada perubahan label. Item baru yang muncul di
katalog default tapi belum ada di layout tersimpan otomatis di-append di akhir
saat sidebar merender.

## Perubahan yang diperlukan

### 1. Database (migration)

Tabel `menu_layouts`:
- `role app_role PRIMARY KEY`
- `layout jsonb NOT NULL`
- `updated_at timestamptz`
- GRANT `SELECT` ke `authenticated`; GRANT `ALL` ke `service_role`.
- RLS: SELECT untuk `authenticated`; INSERT/UPDATE/DELETE hanya admin (`has_role(auth.uid(),'admin')`).
- Trigger `update_updated_at_column` untuk `updated_at`.

### 2. Katalog default sidebar

Ekstrak definisi menu (icon + url + grup) dari `src/components/app-sidebar.tsx`
ke `src/lib/sidebar-menu.ts` sebagai `DEFAULT_SIDEBAR: SidebarNode[]` dengan
`id`/`key` stabil. `menu-catalog.ts` yang lama tetap dipakai untuk fitur akses
menu; ini file baru khusus layout sidebar.

### 3. Server functions — `src/lib/menu-layout.functions.ts`

- `getMyMenuLayout()` — pakai `requireSupabaseAuth`, deteksi role user, kembalikan layout tersimpan untuk role tersebut (fallback ke default).
- `listMenuLayouts()` — admin only, kembalikan layout semua role.
- `saveMenuLayout({ role, layout })` — admin only, upsert.
- `resetMenuLayout({ role })` — admin only, delete row.

Guard admin memakai `has_role(auth.uid(),'admin')` via RPC.

### 4. Sidebar refactor — `src/components/app-sidebar.tsx`

- Ambil layout via `useQuery(['sidebar-layout'])` dari `getMyMenuLayout`.
- Merge dengan `DEFAULT_SIDEBAR`: pakai override (order, label, hidden, group placement); item baru dari default di-append; item yang sudah tidak ada di default di-drop.
- Tetap render hidden=false saja; icon dan url tetap dari katalog default.

### 5. Route baru — `src/routes/_authenticated/pengaturan.menu.tsx`

- Tab role (Admin / Moderator / User).
- Untuk role terpilih: pohon menu (top-level list + group dengan children) memakai `@dnd-kit/core` + `@dnd-kit/sortable`.
  - Drag handle di setiap baris.
  - Drop antar top-level dan antar children.
  - Leaf bisa didrop ke top-level (jadi item tanpa grup) atau ke dalam grup.
  - Group tidak bisa di-nest.
- Setiap baris: toggle visibility (switch), input rename inline, tombol reset label ke default, badge url/key.
- Tombol "Simpan Perubahan" dan "Reset ke Default".
- Loader route memakai `listMenuLayouts` (authenticated + admin). Non-admin diarahkan ke `/dashboard` dengan toast.

### 6. Tambah entry sidebar

Tambah `{ title: "Menu", url: "/pengaturan/menu", icon: ListTree }` ke grup **Pengaturan** di `DEFAULT_SIDEBAR`.

### 7. Cache invalidation

Setelah save/reset di halaman admin, invalidate `['sidebar-layout']` supaya sidebar user lain (dan admin sendiri) refresh setelah reload.

## Dependency baru

- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` untuk drag & drop.

## Catatan teknis

- Perubahan hanya berlaku untuk sidebar UI; RLS/route access tetap dijaga oleh fitur "Akses Menu" yang sudah ada (`user_menu_permissions`). Menyembunyikan menu di sini tidak menutup route — hanya UI.
- Layout untuk role user yang belum pernah disimpan otomatis pakai default.
- Icon tidak bisa diganti admin (di luar scope permintaan).
