import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarCheck,
  BookOpen,
  Users,
  Database,
  LogOut,
  GraduationCap,
  FileBarChart,
  Clock,
  AlertTriangle,
  CalendarDays,
  FolderOpen,
  UserCheck,
  Library,
  Mail,
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
  ChevronDown,
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

} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type LeafItem = { title: string; url: string; icon: any };
type GroupItem = { title: string; icon: any; children: LeafItem[] };
type MenuItem = LeafItem | GroupItem;

const isGroup = (i: MenuItem): i is GroupItem => "children" in i;

const items: MenuItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Dashboard Guru", url: "/dashboard-guru", icon: UserCheck },
  { title: "Dashboard Murid", url: "/dashboard-murid", icon: GraduationCap },
  { title: "Dashboard Kelas", url: "/dashboard-kelas", icon: School },
  { title: "Dashboard Ka. Prog", url: "/dashboard-kaprog", icon: GraduationCap },
  { title: "Presensi", url: "/presensi", icon: CalendarCheck },
  { title: "Laporan Presensi", url: "/laporan-presensi", icon: FileBarChart },
  { title: "Revisi Presensi", url: "/revisi-presensi", icon: FileBarChart },
  { title: "Keterlambatan", url: "/keterlambatan", icon: Clock },
  { title: "Surat Peringatan", url: "/sp", icon: AlertTriangle },
  {
    title: "Manajemen Sekolah",
    icon: School,
    children: [
      { title: "Manajemen Rombel", url: "/rombel", icon: GraduationCap },
      { title: "Rombel Khusus", url: "/rombel-khusus", icon: Layers },
      { title: "Konsentrasi Keahlian", url: "/konsentrasi", icon: Briefcase },
      { title: "Manajemen Mata Pelajaran", url: "/mapel", icon: BookOpen },
      { title: "Manajemen Guru", url: "/guru", icon: Users },
      { title: "Jadwal Pelajaran", url: "/jadwal", icon: CalendarDays },
      { title: "Manajemen Denah", url: "/denah", icon: MapIcon },
      { title: "Manajemen Hari Efektif", url: "/hari-efektif", icon: CalendarRange },
      { title: "Manajemen Notifikasi", url: "/notifikasi", icon: Bell },
      { title: "Tahun Ajaran", url: "/tahun-ajaran", icon: CalendarRange },
      { title: "Semester", url: "/semester", icon: CalendarClock },
    ],
  },
  { title: "Berkas Pembelajaran", url: "/berkas", icon: FolderOpen },
  {
    title: "Pembelajaran",
    icon: GraduationCap,
    children: [
      { title: "Administrasi Pembelajaran", url: "/pembelajaran/administrasi", icon: FileText },
      { title: "Pengaturan Pembelajaran", url: "/pembelajaran/pengaturan", icon: Settings },
      { title: "Pengelolaan Nilai", url: "/pembelajaran/nilai", icon: Award },
      { title: "Dashboard Nilai", url: "/pembelajaran/dashboard-nilai", icon: BarChart3 },
      { title: "Pelaksanaan KBM", url: "/pembelajaran/kbm", icon: BookOpenCheck },
      { title: "Rekap Pelaksanaan KBM", url: "/pembelajaran/rekap-kbm", icon: BarChart3 },
    ],
  },
  { title: "Izin Guru", url: "/guru-izin", icon: UserCheck },
  { title: "Perpustakaan", url: "/perpus", icon: Library },
  { title: "Persuratan", url: "/persuratan", icon: Mail },
  { title: "Sarpras", url: "/sarpras", icon: Building2 },
  { title: "TPG", url: "/tpg", icon: Wallet },
  { title: "Notifikasi WA", url: "/notifikasi", icon: MessageSquare },
  { title: "Verval Siswa", url: "/verval", icon: ClipboardCheck },
  { title: "Mutasi Siswa", url: "/mutasi", icon: ArrowLeftRight },
  { title: "Kenaikan Kelas", url: "/kenaikan-kelas", icon: GraduationCap },
  { title: "KBM", url: "/kbm", icon: BookOpen },
  { title: "Master Data", url: "/master", icon: Users },
  { title: "Manajemen User", url: "/users", icon: UserCog },
  { title: "Aktivitas / Log", url: "/aktivitas", icon: Activity },
  { title: "Impor Backup", url: "/import", icon: Database },
  {
    title: "Pengaturan",
    icon: Settings,
    children: [
      { title: "Tampilan", url: "/pengaturan/tampilan", icon: Palette },
      { title: "Storage", url: "/pengaturan/storage", icon: HardDrive },
      { title: "Database", url: "/pengaturan/database", icon: Database },
      { title: "Analytics", url: "/pengaturan/analytics", icon: BarChart3 },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Berhasil keluar");
    navigate({ to: "/auth", replace: true });
  };

  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-bold text-sm">SUPREME</div>
              <div className="text-xs opacity-80">XPOES</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) =>
                isGroup(item) ? (
                  <GroupMenu key={item.title} item={item} collapsed={collapsed} isActive={isActive} />
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Keluar</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function GroupMenu({
  item,
  collapsed,
  isActive,
}: {
  item: GroupItem;
  collapsed: boolean;
  isActive: (url: string) => boolean;
}) {
  const anyActive = item.children.some((c) => isActive(c.url));
  const [open, setOpen] = useState(anyActive);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={anyActive} className="w-full">
            <item.icon className="h-4 w-4" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.title}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </>
            )}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        {!collapsed && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children.map((c) => (
                <SidebarMenuSubItem key={c.title}>
                  <SidebarMenuSubButton asChild isActive={isActive(c.url)}>
                    <Link to={c.url} className="flex items-center gap-2">
                      <c.icon className="h-3.5 w-3.5" />
                      <span>{c.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
}
