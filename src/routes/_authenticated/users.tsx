import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Trash2, Pencil, KeyRound, Download, Upload, LogOut, RefreshCw,
  Filter, Power, ShieldCheck, Info, Users as UsersIcon, ChevronLeft, ChevronRight,
  Menu as MenuIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  listUsers, createUser, updateUser, deleteUser, resetPassword, userSummary,
  toggleUserActive, bulkSetAllActive, forceLogoutAll, listUserActivity,
} from "@/lib/users.functions";
import { MenuAccessDialog, BulkMenuAccessDialog } from "@/components/menu-access-dialogs";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Manajemen User — SUPREME XPOES" }] }),
  component: UsersPage,
  errorComponent: ({ error }) => <div className="text-destructive p-6">Gagal: {error.message}</div>,
});

const ROLES = ["superadmin", "admin", "wakasek", "kakonli", "walas", "guru", "murid", "admin_sarpras", "admin_persuratan", "admin_tpg"] as const;
type Role = typeof ROLES[number];

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  wakasek: "Waka",
  kakonli: "Kakonli",
  walas: "Walas",
  guru: "Guru",
  murid: "Murid",
  admin_sarpras: "Admin Sarpras",
  admin_persuratan: "Admin Persuratan",
  admin_tpg: "Admin TPG",
};

const ROLE_BADGE: Record<string, string> = {
  superadmin: "bg-red-500/10 text-red-700 border-red-500/20",
  admin: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  guru: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  murid: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  wakasek: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  kakonli: "bg-pink-500/10 text-pink-700 border-pink-500/20",
  walas: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
  admin_sarpras: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  admin_persuratan: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  admin_tpg: "bg-teal-500/10 text-teal-700 border-teal-500/20",
};

function relTime(iso?: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s} dtk lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function UsersPage() {
  const qc = useQueryClient();

  // Filters / pagination
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [sort, setSort] = useState<"name_asc" | "name_desc" | "created_desc" | "created_asc">("name_asc");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Dialogs

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [resetFor, setResetFor] = useState<any>(null);
  const [menuFor, setMenuFor] = useState<any>(null);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);

  const fetchList = useServerFn(listUsers);
  const fetchSum = useServerFn(userSummary);
  const createFn = useServerFn(createUser);
  const updateFn = useServerFn(updateUser);
  const delFn = useServerFn(deleteUser);
  const resetFn = useServerFn(resetPassword);
  const toggleFn = useServerFn(toggleUserActive);
  const bulkFn = useServerFn(bulkSetAllActive);
  const forceFn = useServerFn(forceLogoutAll);

  const { data: page1 } = useSuspenseQuery({
    queryKey: ["users", { search, role, status, sort, page, pageSize }],
    queryFn: () => fetchList({ data: { search: search || undefined, role, status, sort, page, pageSize } }),
  });
  const { data: sum } = useQuery({ queryKey: ["users-sum"], queryFn: () => fetchSum() });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["users"] });
    qc.invalidateQueries({ queryKey: ["users-sum"] });
    qc.invalidateQueries({ queryKey: ["user-activity"] });
  };

  const create = useMutation({
    mutationFn: (v: any) => createFn({ data: v }),
    onSuccess: () => { toast.success("User dibuat"); setOpen(false); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const upd = useMutation({
    mutationFn: (v: any) => updateFn({ data: v }),
    onSuccess: () => { toast.success("Tersimpan"); setOpen(false); setEdit(null); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Terhapus"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const reset = useMutation({
    mutationFn: (v: { id: string; password: string }) => resetFn({ data: v }),
    onSuccess: () => { toast.success("Password direset"); setResetFor(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: (v: { id: string; is_active: boolean }) => toggleFn({ data: v }),
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e.message),
  });
  const bulk = useMutation({
    mutationFn: (active: boolean) => bulkFn({ data: { is_active: active } }),
    onSuccess: (r) => { toast.success(`${r.affected} user diperbarui`); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const force = useMutation({
    mutationFn: () => forceFn(),
    onSuccess: (r) => { toast.success(`Force logout: ${r.count} sesi`); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const visibleIds = (page1?.rows ?? []).map((u: any) => u.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id: string) => selected.has(id));
  const someVisibleSelected = visibleIds.some((id: string) => selected.has(id)) && !allVisibleSelected;
  const selectedCount = selected.size;

  useEffect(() => {
    setSelected(new Set());
  }, [search, role, status, sort, pageSize]);

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id: string) => next.delete(id));
      } else {
        visibleIds.forEach((id: string) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetFilters = () => {
    setSearch(""); setRole("all"); setStatus("all"); setSort("name_asc"); setPageSize(25); setPage(1);
  };


  const onlineCount = page1?.onlineCount ?? 0;
  const totalAll = page1?.totalAll ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalAll / pageSize));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Manajemen User</h1>
          <p className="text-sm text-muted-foreground">Kelola pengguna sistem presensi</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Download Template</Button>
          <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-2" />Import User</Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEdit(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Tambah User</Button>
            </DialogTrigger>
            <UserFormDialog
              key={edit?.id ?? "new"}
              edit={edit}
              onSubmit={(v) => edit ? upd.mutate({ ...v, id: edit.id }) : create.mutate(v)}
              loading={create.isPending || upd.isPending}
            />
          </Dialog>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => { if (confirm("Force logout semua user? Mereka akan diminta login ulang.")) force.mutate(); }}
            disabled={force.isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />Force Logout Semua
          </Button>
        </div>
      </div>

      {/* Kontrol akses */}
      <Card className="border-emerald-200 bg-emerald-50/60">
        <CardContent className="flex items-center justify-between gap-3 py-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <Power className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <div className="font-semibold text-emerald-900">Kontrol Akses Semua User</div>
              <div className="text-xs text-emerald-800/70">Semua user aktif dan dapat mengakses sistem</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-800 hover:bg-emerald-100"
              onClick={() => { if (confirm("Aktifkan semua user?")) bulk.mutate(true); }}>
              Aktifkan Semua
            </Button>
            <Button size="sm" variant="destructive"
              onClick={() => { if (confirm("Nonaktifkan semua user (kecuali Anda)?")) bulk.mutate(false); }}>
              Nonaktifkan Semua
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Role */}
      <Card className="border-sky-200 bg-sky-50/60">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-sky-700 mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-semibold text-sky-900 mb-2">Informasi Role &amp; Akses</div>
              <ul className="space-y-1 text-sky-900/90">
                <li><span className="font-semibold">Superadmin:</span> Akses penuh tanpa batas, termasuk pengelolaan sistem tingkat lanjut.</li>
                <li><span className="font-semibold">Admin:</span> Dapat mengakses semua fitur dan semua rombel.</li>
                <li><span className="font-semibold">User:</span> Hanya dapat mengakses menu dan rombel yang ditentukan admin.</li>
                <li><span className="font-semibold">Guru:</span> Akun khusus untuk guru dengan akses menu dan rombel yang ditentukan.</li>
                <li><span className="font-semibold">Murid:</span> Akun khusus untuk murid dengan akses menu dan rombel yang ditentukan.</li>
                <li><span className="font-semibold">Waka:</span> Wakil Kepala Sekolah dengan akses menu dan rombel yang ditentukan.</li>
                <li><span className="font-semibold">Kakonli:</span> Ketua Konsentrasi Keahlian dengan akses menu dan rombel yang ditentukan.</li>
                <li><span className="font-semibold">Walas:</span> Wali Kelas dengan akses menu dan rombel yang ditentukan.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daftar Pengguna */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UsersIcon className="h-5 w-5" /> Daftar Pengguna
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Total {totalAll} pengguna terdaftar</p>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20" variant="outline">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1.5" />{onlineCount} online
              </Badge>
              <Badge variant="outline">{totalAll} total</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Cari nama, email…"
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              className="max-w-md"
            />
            <Select value={role} onValueChange={(v) => { setPage(1); setRole(v); }}>
              <SelectTrigger className="w-[160px]"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Semua Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v: any) => { setPage(1); setStatus(v); }}>
              <SelectTrigger className="w-[140px]"><Power className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v: any) => setSort(v)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name_asc">Nama A → Z</SelectItem>
                <SelectItem value="name_desc">Nama Z → A</SelectItem>
                <SelectItem value="created_desc">Terbaru</SelectItem>
                <SelectItem value="created_asc">Terlama</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={resetFilters}><RefreshCw className="h-3.5 w-3.5 mr-1" />Reset</Button>
          </div>

          {/* Bulk actions */}
          {selectedCount > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3 flex-wrap">
              <div className="text-sm">
                <span className="font-semibold">{selectedCount}</span> user dipilih
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const results = await Promise.allSettled(
                      Array.from(selected).map((id) => toggle.mutateAsync({ id, is_active: true }))
                    );
                    const ok = results.filter((r) => r.status === "fulfilled").length;
                    toast.success(`${ok} user diaktifkan`);
                    setSelected(new Set());
                    invalidate();
                  }}
                  disabled={toggle.isPending}
                >
                  <Power className="h-3.5 w-3.5 mr-1" />Aktifkan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const results = await Promise.allSettled(
                      Array.from(selected).map((id) => toggle.mutateAsync({ id, is_active: false }))
                    );
                    const ok = results.filter((r) => r.status === "fulfilled").length;
                    toast.success(`${ok} user dinonaktifkan`);
                    setSelected(new Set());
                    invalidate();
                  }}
                  disabled={toggle.isPending}
                >
                  <Power className="h-3.5 w-3.5 mr-1" />Nonaktifkan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkMenuOpen(true)}
                >
                  <MenuIcon className="h-3.5 w-3.5 mr-1" />Atur Akses Menu
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    if (!confirm(`Hapus ${selectedCount} user yang dipilih?`)) return;
                    const results = await Promise.allSettled(
                      Array.from(selected).map((id) => del.mutateAsync(id))
                    );
                    const ok = results.filter((r) => r.status === "fulfilled").length;
                    const failed = results.length - ok;
                    toast.success(`${ok} user terhapus${failed > 0 ? `, ${failed} gagal` : ""}`);
                    setSelected(new Set());
                    invalidate();
                  }}
                  disabled={del.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />Hapus
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  Batal
                </Button>
              </div>
            </div>
          )}


          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Pilih semua user di halaman ini"
                    />
                  </TableHead>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>NIP/NIS</TableHead>
                  <TableHead>Online</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(page1?.rows ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Tidak ada user</TableCell></TableRow>
                )}
                {(page1?.rows ?? []).map((u: any, idx: number) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(u.id)}
                        onCheckedChange={() => toggleSelectRow(u.id)}
                        aria-label={`Pilih ${u.full_name ?? u.email}`}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(page - 1) * pageSize + idx + 1}</TableCell>
                    <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-blue-700">{u.email ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        {u.roles.map((r: Role) => (
                          <Badge key={r} variant="outline" className={`text-xs ${ROLE_BADGE[r] ?? ""}`}>
                            <ShieldCheck className="h-3 w-3 mr-1" />{ROLE_LABEL[r] ?? r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.nip || u.nis || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${u.online ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                        <div className="text-xs">
                          <div>{u.online ? "Online" : "Offline"}</div>
                          {!u.online && <div className="text-muted-foreground">{relTime(u.last_seen_at)}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={u.is_active !== false}
                          onCheckedChange={(v) => toggle.mutate({ id: u.id, is_active: v })}
                        />
                        <span className="text-xs text-muted-foreground">{u.is_active === false ? "Nonaktif" : "Aktif"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setMenuFor(u)} title="Atur akses menu">
                          <MenuIcon className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setResetFor(u)} title="Reset password">
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEdit(u); setOpen(true); }} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm(`Hapus user "${u.full_name ?? u.email}"?`)) del.mutate(u.id); }} title="Hapus">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs text-muted-foreground">
              Menampilkan {(page1?.rows ?? []).length} dari {totalAll} data
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>
              <span className="text-sm px-2">Hal. {page} / {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Aktivitas */}
      <ActivityLogCard />

      {/* Reset PW */}
      <Dialog open={!!resetFor} onOpenChange={(o) => !o && setResetFor(null)}>
        {resetFor && (
          <ResetPasswordDialog
            user={resetFor}
            onSubmit={(pw) => reset.mutate({ id: resetFor.id, password: pw })}
            loading={reset.isPending}
          />
        )}
      </Dialog>

      {/* Akses Menu individu */}
      <MenuAccessDialog
        user={menuFor}
        open={!!menuFor}
        onOpenChange={(o) => !o && setMenuFor(null)}
      />

      {/* Akses Menu massal */}
      <BulkMenuAccessDialog
        userIds={Array.from(selected)}
        open={bulkMenuOpen}
        onOpenChange={setBulkMenuOpen}
        onSaved={() => setSelected(new Set())}
      />
    </div>
  );
}

// ====================== Activity Log Card ======================
function ActivityLogCard() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const fetchFn = useServerFn(listUserActivity);
  const { data } = useQuery({
    queryKey: ["user-activity", { search, action, from, to, page }],
    queryFn: () => fetchFn({
      data: {
        search: search || undefined,
        action,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
        page, pageSize,
      },
    }),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Log Aktivitas User
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["user-activity"] })}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Cari berdasarkan email, nama, atau deskripsi…"
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            className="flex-1 min-w-[240px]"
          />
          <Select value={action} onValueChange={(v) => { setPage(1); setAction(v); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Semua Aksi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Aksi</SelectItem>
              {(data?.actions ?? []).map((a: string) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Dari:</span>
          <Input type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} className="w-[160px]" />
          <span className="text-muted-foreground">Sampai:</span>
          <Input type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} className="w-[160px]" />
          {(from || to) && (
            <Button size="sm" variant="ghost" onClick={() => { setFrom(""); setTo(""); setPage(1); }}>Bersihkan</Button>
          )}
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[180px]">Waktu</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="w-[140px]">Aksi</TableHead>
                <TableHead>Deskripsi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.rows ?? []).length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Tidak ada log</TableCell></TableRow>
              )}
              {(data?.rows ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{r.user_full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.user_email ?? "—"}</div>
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{r.action ?? "—"}</Badge></TableCell>
                  <TableCell className="text-sm">{r.description ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-muted-foreground">Menampilkan {(data?.rows ?? []).length} dari {total} log</div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">Hal. {page} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ====================== Dialogs ======================
function UserFormDialog({ edit, onSubmit, loading }: { edit: any; onSubmit: (v: any) => void; loading: boolean }) {
  console.log("[UserFormDialog] mount, edit=", edit);
  const [form, setForm] = useState<any>(() => ({
    email: edit?.email ?? "",
    password: "",
    full_name: edit?.full_name ?? "",
    nip: edit?.nip ?? "",
    nis: edit?.nis ?? "",
    is_active: edit?.is_active !== false,
    roles: edit?.roles ?? ["guru"],
  }));
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const toggleRole = (r: Role) =>
    set("roles", form.roles.includes(r) ? form.roles.filter((x: Role) => x !== r) : [...form.roles, r]);

  const canSubmit = form.full_name && form.roles.length > 0 && (edit || (form.email && form.password.length >= 6));

  return (
    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{edit ? "Edit" : "Tambah"} User</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Email {edit && <span className="text-xs text-muted-foreground">(tidak dapat diubah)</span>}</Label>
          <Input value={form.email} disabled={!!edit} onChange={(e) => set("email", e.target.value)} placeholder="user@xpoes.sch.id" />
        </div>
        {!edit && (
          <div>
            <Label>Password Awal</Label>
            <Input type="text" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="min 6 karakter" />
          </div>
        )}
        <div>
          <Label>Nama Lengkap</Label>
          <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>NIP</Label><Input value={form.nip ?? ""} onChange={(e) => set("nip", e.target.value)} /></div>
          <div><Label>NIS</Label><Input value={form.nis ?? ""} onChange={(e) => set("nis", e.target.value)} /></div>
        </div>
        {edit && (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div><Label>Akun Aktif</Label><p className="text-xs text-muted-foreground">User nonaktif tidak dapat melakukan aksi</p></div>
            <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
          </div>
        )}
        <div>
          <Label className="mb-2 block">Role (pilih satu atau lebih)</Label>
          <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
            {ROLES.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={form.roles.includes(r)} onCheckedChange={() => toggleRole(r)} />
                {ROLE_LABEL[r]}
              </label>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(form)} disabled={loading || !canSubmit}>Simpan</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ResetPasswordDialog({ user, onSubmit, loading }: { user: any; onSubmit: (pw: string) => void; loading: boolean }) {
  const [pw, setPw] = useState("");
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Reset Password</DialogTitle>
        <p className="text-sm text-muted-foreground">{user.full_name ?? user.email}</p>
      </DialogHeader>
      <div>
        <Label>Password Baru</Label>
        <Input type="text" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="min 6 karakter" />
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(pw)} disabled={loading || pw.length < 6}>Reset</Button>
      </DialogFooter>
    </DialogContent>
  );
}
