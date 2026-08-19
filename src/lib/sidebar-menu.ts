// Default sidebar catalog with stable IDs. This is the source of truth for
// icons and URLs. Admin-configurable layout (order, hidden, rename, group
// placement) is stored per-role in the `menu_layouts` table and merged with
// this catalog at render time.

import {
  LayoutDashboard,
  CalendarCheck,
  BookOpen,
  Users,
  Database,
  GraduationCap,
  FileBarChart,
  Clock,
  AlertTriangle,
  CalendarDays,
  FolderOpen,
  UserCheck,
  Library,
  Mail,
  Inbox,
  Send,
  ClipboardList,
  ArrowRightLeft,
  Archive,

  Building2,
  CalendarRange,
  Wallet,
  MessageSquare,
  Settings,
  ClipboardCheck,
  UserCog,
  Activity,
  ArrowLeftRight,
  School,
  Layers,
  Briefcase,
  Map as MapIcon,
  Bell,
  CalendarClock,
  FileText,
  Award,
  BarChart3,
  BookOpenCheck,
  Palette,
  HardDrive,
  ListTree,
  BookUser,
  type LucideIcon,
} from "lucide-react";

export type DefaultLeaf = {
  id: string;
  title: string;
  url: string;
  icon: LucideIcon;
};

export type DefaultGroup = {
  id: string;
  title: string;
  icon: LucideIcon;
  children: DefaultLeaf[];
};

export type DefaultNode = DefaultLeaf | DefaultGroup;

export const isDefaultGroup = (n: DefaultNode): n is DefaultGroup =>
  "children" in n;

export const DEFAULT_SIDEBAR: DefaultNode[] = [
  { id: "dashboard", title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { id: "dashboard-guru", title: "Dashboard Guru", url: "/dashboard-guru", icon: UserCheck },
  { id: "dashboard-murid", title: "Dashboard Murid", url: "/dashboard-murid", icon: GraduationCap },
  { id: "dashboard-kelas", title: "Dashboard Kelas", url: "/dashboard-kelas", icon: School },
  { id: "dashboard-kakonli", title: "Dashboard Kakonli", url: "/dashboard-kakonli", icon: GraduationCap },
  {
    id: "grp-presensi",
    title: "Presensi",
    icon: CalendarCheck,
    children: [
      { id: "presensi", title: "Input Presensi", url: "/presensi", icon: CalendarCheck },
      { id: "presensi-kelompok", title: "Input Presensi Kelompok Belajar", url: "/presensi-kelompok", icon: Users },
      { id: "laporan-presensi", title: "Laporan Presensi", url: "/laporan-presensi", icon: FileBarChart },
      { id: "laporan-presensi-kelompok", title: "Laporan Presensi Kelompok Belajar", url: "/laporan-presensi-kelompok", icon: FileBarChart },
      { id: "revisi-presensi", title: "Revisi Presensi", url: "/revisi-presensi", icon: FileBarChart },
    ],
  },
  {
    id: "grp-keterlambatan",
    title: "Keterlambatan",
    icon: Clock,
    children: [
      { id: "keterlambatan", title: "Input Keterlambatan", url: "/keterlambatan", icon: Clock },
      { id: "laporan-keterlambatan", title: "Laporan Keterlambatan", url: "/laporan-keterlambatan", icon: FileBarChart },
    ],
  },
  { id: "sp", title: "Manajemen BP/BK", url: "/sp", icon: AlertTriangle },
  {
    id: "grp-manajemen-sekolah",
    title: "Manajemen Sekolah",
    icon: School,
    children: [
      { id: "rombel", title: "Manajemen Rombel", url: "/rombel", icon: GraduationCap },
      { id: "murid", title: "Manajemen Murid", url: "/murid", icon: Users },
      { id: "rombel-khusus", title: "Rombel Khusus", url: "/rombel-khusus", icon: Layers },
      { id: "kelompok-belajar", title: "Kelompok Belajar", url: "/kelompok-belajar", icon: Users },
      { id: "konsentrasi", title: "Konsentrasi Keahlian", url: "/konsentrasi", icon: Briefcase },
      { id: "mapel", title: "Manajemen Mata Pelajaran", url: "/mapel", icon: BookOpen },
      { id: "guru", title: "Manajemen Guru", url: "/guru", icon: Users },
      { id: "tendik", title: "Manajemen Tendik", url: "/tendik", icon: UserCog },
      { id: "jadwal", title: "Jadwal Pelajaran", url: "/jadwal", icon: CalendarDays },
      { id: "denah", title: "Manajemen Denah", url: "/denah", icon: MapIcon },
      { id: "hari-efektif", title: "Manajemen Hari Efektif", url: "/hari-efektif", icon: CalendarRange },
      { id: "manajemen-notifikasi", title: "Manajemen Notifikasi", url: "/notifikasi", icon: Bell },
      { id: "tahun-ajaran", title: "Tahun Ajaran", url: "/tahun-ajaran", icon: CalendarRange },
      { id: "semester", title: "Semester", url: "/semester", icon: CalendarClock },
    ],
  },
  { id: "berkas", title: "Berkas Pembelajaran", url: "/berkas", icon: FolderOpen },
  {
    id: "grp-pembelajaran",
    title: "Pembelajaran",
    icon: GraduationCap,
    children: [
      { id: "pembelajaran-administrasi", title: "Administrasi Pembelajaran", url: "/pembelajaran/administrasi", icon: FileText },
      { id: "pembelajaran-agenda-guru", title: "Agenda Guru", url: "/pembelajaran/agenda-guru", icon: BookUser },
      { id: "pembelajaran-rekap-agenda-guru", title: "Rekap Agenda Guru", url: "/pembelajaran/rekap-agenda-guru", icon: BarChart3 },
      { id: "pembelajaran-pengaturan", title: "Pengaturan Pembelajaran", url: "/pembelajaran/pengaturan", icon: Settings },
      { id: "pembelajaran-nilai", title: "Pengelolaan Nilai", url: "/pembelajaran/nilai", icon: Award },
      { id: "pembelajaran-dashboard-nilai", title: "Dashboard Nilai", url: "/pembelajaran/dashboard-nilai", icon: BarChart3 },
    ],
  },
  { id: "guru-izin", title: "Izin Guru", url: "/guru-izin", icon: UserCheck },
  { id: "perpus", title: "Perpustakaan", url: "/perpus", icon: Library },
  {
    id: "grp-persuratan",
    title: "Persuratan",
    icon: Mail,
    children: [
      { id: "persuratan-dashboard", title: "Dashboard Persuratan", url: "/persuratan/dashboard", icon: LayoutDashboard },
      { id: "persuratan-surat-masuk", title: "Surat Masuk", url: "/persuratan/surat-masuk", icon: Inbox },
      { id: "persuratan-surat-keluar", title: "Surat Keluar", url: "/persuratan/surat-keluar", icon: Send },
      { id: "persuratan-surat-tugas", title: "Surat Tugas", url: "/persuratan/surat-tugas", icon: ClipboardList },
      { id: "persuratan-disposisi", title: "Disposisi", url: "/persuratan/disposisi", icon: ArrowRightLeft },
      { id: "persuratan-arsip", title: "Arsip Surat", url: "/persuratan/arsip", icon: Archive },
      { id: "persuratan-pengaturan", title: "Pengaturan", url: "/persuratan/pengaturan", icon: Settings },
    ],
  },

  { id: "sarpras", title: "Sarpras", url: "/sarpras", icon: Building2 },
  {
    id: "grp-tpg",
    title: "TPG",
    icon: Wallet,
    children: [
      { id: "tpg-laporan", title: "Laporan TPG", url: "/tpg/laporan", icon: FileBarChart },
      { id: "tpg-administrasi", title: "Administrasi", url: "/tpg/administrasi", icon: ClipboardList },
      { id: "tpg-penyerahan-iuran", title: "Penyerahan Iuran", url: "/tpg/penyerahan-iuran", icon: Wallet },
      { id: "tpg-periode-aktif", title: "Periode Aktif", url: "/tpg/periode-aktif", icon: CalendarRange },
      { id: "tpg-referensi", title: "Referensi", url: "/tpg/referensi", icon: Database },
    ],
  },
  { id: "notifikasi-wa", title: "Notifikasi WA", url: "/notifikasi", icon: MessageSquare },
  { id: "verval", title: "Verval Murid", url: "/verval", icon: ClipboardCheck },
  { id: "mutasi", title: "Mutasi Murid", url: "/mutasi", icon: ArrowLeftRight },
  { id: "kenaikan-kelas", title: "Kenaikan Kelas", url: "/kenaikan-kelas", icon: GraduationCap },
  {
    id: "grp-kbm",
    title: "KBM",
    icon: BookOpen,
    children: [
      { id: "kbm-lapor", title: "Lapor KBM", url: "/pembelajaran/kbm", icon: BookOpenCheck },
      { id: "kbm-rekap", title: "Rekap KBM", url: "/pembelajaran/rekap-kbm", icon: BarChart3 },
    ],
  },
  { id: "master", title: "Master Data", url: "/master", icon: Users },
  { id: "users", title: "Manajemen User", url: "/users", icon: UserCog },
  { id: "aktivitas", title: "Aktivitas / Log", url: "/aktivitas", icon: Activity },
  { id: "import", title: "Impor Backup", url: "/import", icon: Database },
  {
    id: "grp-pengaturan",
    title: "Pengaturan",
    icon: Settings,
    children: [
      { id: "pengaturan-tampilan", title: "Tampilan", url: "/pengaturan/tampilan", icon: Palette },
      { id: "pengaturan-storage", title: "Storage", url: "/pengaturan/storage", icon: HardDrive },
      { id: "pengaturan-database", title: "Database", url: "/pengaturan/database", icon: Database },
      { id: "pengaturan-analytics", title: "Analytics", url: "/pengaturan/analytics", icon: BarChart3 },
      { id: "pengaturan-menu", title: "Pengaturan Menu", url: "/pengaturan/menu", icon: ListTree },
    ],
  },
];

// Merge stored layout with defaults, returning a LayoutNode[] that includes
// any default groups/leaves missing from the stored version. Used by the
// admin menu editor so newly-added default items appear automatically.
export function mergeLayoutWithDefaults(
  stored: LayoutNode[] | null | undefined,
): LayoutNode[] {
  if (!stored || stored.length === 0) return defaultLayout();
  const out: LayoutNode[] = stored.map((n) =>
    n.kind === "group"
      ? { ...n, children: n.children.map((c) => ({ ...c })) }
      : { ...n },
  );
  const usedLeaf = new Set<string>();
  const usedGroup = new Set<string>();
  for (const n of out) {
    if (n.kind === "group") {
      usedGroup.add(n.id);
      for (const c of n.children) usedLeaf.add(c.id);
    } else {
      usedLeaf.add(n.id);
    }
  }
  for (const n of DEFAULT_SIDEBAR) {
    if (isDefaultGroup(n)) {
      if (usedGroup.has(n.id)) {
        const g = out.find(
          (r): r is LayoutGroupOverride => r.kind === "group" && r.id === n.id,
        );
        if (g) {
          for (const c of n.children) {
            if (!usedLeaf.has(c.id)) {
              usedLeaf.add(c.id);
              g.children.push({ kind: "leaf", id: c.id });
            }
          }
        }
      } else {
        const children: LayoutLeafOverride[] = [];
        for (const c of n.children) {
          if (usedLeaf.has(c.id)) continue;
          usedLeaf.add(c.id);
          children.push({ kind: "leaf", id: c.id });
        }
        out.push({ kind: "group", id: n.id, children });
      }
    } else if (!usedLeaf.has(n.id)) {
      usedLeaf.add(n.id);
      out.push({ kind: "leaf", id: n.id });
    }
  }
  return out;
}

// ---------- Layout types (stored in DB) ----------

export type LayoutLeafOverride = {
  kind: "leaf";
  id: string;
  label?: string;
  hidden?: boolean;
};

export type LayoutGroupOverride = {
  kind: "group";
  id: string;
  label?: string;
  hidden?: boolean;
  children: LayoutLeafOverride[];
};

export type LayoutNode = LayoutLeafOverride | LayoutGroupOverride;

// ---------- Resolved (rendered) types ----------

export type ResolvedLeaf = {
  kind: "leaf";
  id: string;
  title: string;
  url: string;
  icon: LucideIcon;
  hidden: boolean;
};

export type ResolvedGroup = {
  kind: "group";
  id: string;
  title: string;
  icon: LucideIcon;
  hidden: boolean;
  children: ResolvedLeaf[];
};

export type ResolvedNode = ResolvedLeaf | ResolvedGroup;

// Indexes over defaults for lookup by id.
export function buildDefaultIndex() {
  const leaves = new Map<string, DefaultLeaf>();
  const groups = new Map<string, DefaultGroup>();
  for (const n of DEFAULT_SIDEBAR) {
    if (isDefaultGroup(n)) {
      groups.set(n.id, n);
      for (const c of n.children) leaves.set(c.id, c);
    } else {
      leaves.set(n.id, n);
    }
  }
  return { leaves, groups };
}

// Convert defaults to a fresh layout (for admin editor / fallback).
export function defaultLayout(): LayoutNode[] {
  return DEFAULT_SIDEBAR.map((n) =>
    isDefaultGroup(n)
      ? {
          kind: "group" as const,
          id: n.id,
          children: n.children.map((c) => ({ kind: "leaf" as const, id: c.id })),
        }
      : { kind: "leaf" as const, id: n.id },
  );
}

// Merge stored layout with defaults into renderable tree. Missing default
// items are appended at the end (leaves top-level, groups with all children).
export function resolveLayout(layout: LayoutNode[] | null | undefined): ResolvedNode[] {
  const { leaves: leafIdx, groups: groupIdx } = buildDefaultIndex();
  const usedLeafIds = new Set<string>();
  const usedGroupIds = new Set<string>();
  const out: ResolvedNode[] = [];

  const src = layout && layout.length ? layout : defaultLayout();

  for (const node of src) {
    if (node.kind === "group") {
      const def = groupIdx.get(node.id);
      if (!def) continue;
      usedGroupIds.add(node.id);
      const children: ResolvedLeaf[] = [];
      for (const c of node.children) {
        const leafDef = leafIdx.get(c.id);
        if (!leafDef || usedLeafIds.has(c.id)) continue;
        usedLeafIds.add(c.id);
        children.push({
          kind: "leaf",
          id: leafDef.id,
          title: c.label?.trim() || leafDef.title,
          url: leafDef.url,
          icon: leafDef.icon,
          hidden: !!c.hidden,
        });
      }
      out.push({
        kind: "group",
        id: def.id,
        title: node.label?.trim() || def.title,
        icon: def.icon,
        hidden: !!node.hidden,
        children,
      });
    } else {
      const def = leafIdx.get(node.id);
      if (!def || usedLeafIds.has(node.id)) continue;
      usedLeafIds.add(node.id);
      out.push({
        kind: "leaf",
        id: def.id,
        title: node.label?.trim() || def.title,
        url: def.url,
        icon: def.icon,
        hidden: !!node.hidden,
      });
    }
  }

  // Append any defaults missing from the stored layout.
  for (const n of DEFAULT_SIDEBAR) {
    if (isDefaultGroup(n)) {
      if (usedGroupIds.has(n.id)) {
        // Group present but maybe missing new default children — append missing.
        const g = out.find((r) => r.kind === "group" && r.id === n.id) as ResolvedGroup | undefined;
        if (g) {
          for (const c of n.children) {
            if (!usedLeafIds.has(c.id)) {
              usedLeafIds.add(c.id);
              g.children.push({
                kind: "leaf",
                id: c.id,
                title: c.title,
                url: c.url,
                icon: c.icon,
                hidden: false,
              });
            }
          }
        }
      } else {
        const children: ResolvedLeaf[] = [];
        for (const c of n.children) {
          if (usedLeafIds.has(c.id)) continue;
          usedLeafIds.add(c.id);
          children.push({
            kind: "leaf",
            id: c.id,
            title: c.title,
            url: c.url,
            icon: c.icon,
            hidden: false,
          });
        }
        out.push({
          kind: "group",
          id: n.id,
          title: n.title,
          icon: n.icon,
          hidden: false,
          children,
        });
      }
    } else if (!usedLeafIds.has(n.id)) {
      usedLeafIds.add(n.id);
      out.push({
        kind: "leaf",
        id: n.id,
        title: n.title,
        url: n.url,
        icon: n.icon,
        hidden: false,
      });
    }
  }

  return out;
}
