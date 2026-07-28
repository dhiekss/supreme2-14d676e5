import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  presensiDashboardKelompok,
  kelompokBelumInputByDate,
  attendanceDetailListKelompok,
  attendanceDetailViewKelompok,
} from "@/lib/presensi-report-kelompok.functions";
import { todayStamp } from "@/lib/utils";
import {
  Download, Users, GraduationCap, School, CalendarCheck, CheckCircle2,
  Thermometer, FileText, XCircle, Briefcase, ClipboardList, AlertTriangle,
  TrendingUp, PieChart as PieIcon, BarChart3, FileSpreadsheet, Loader2,
  Eye, Filter, FileDown, Search,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
} from "recharts";

export const Route = createFileRoute("/_authenticated/laporan-presensi-kelompok")({
  head: () => ({ meta: [{ title: "Laporan Presensi Kelompok Belajar — SUPREME XPOES" }] }),
  component: LaporanPresensiKelompok,
  errorComponent: ({ error }) => <div className="text-destructive p-4">Gagal: {error.message}</div>,
});

const STATUS_COLORS: Record<string, string> = {
  H: "hsl(142 71% 45%)",
  S: "hsl(38 92% 50%)",
  I: "hsl(210 90% 55%)",
  A: "hsl(0 84% 60%)",
  P: "hsl(270 70% 60%)",
};
const STATUS_LABEL: Record<string, string> = { H: "Hadir", S: "Sakit", I: "Izin", A: "Alfa", P: "PKL", "-": "-" };
const STATUS_BADGE: Record<string, string> = {
  H: "bg-emerald-50 text-emerald-700 border-emerald-200",
  S: "bg-amber-50 text-amber-700 border-amber-200",
  I: "bg-sky-50 text-sky-700 border-sky-200",
  A: "bg-rose-50 text-rose-700 border-rose-200",
  P: "bg-violet-50 text-violet-700 border-violet-200",
  "-": "bg-muted text-muted-foreground border-muted",
};
const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
function formatDateLongID(iso: string) {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y) return iso;
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return `${DAYS_ID[dt.getDay()]}, ${dt.getDate()} ${MONTHS_ID[dt.getMonth()]} ${dt.getFullYear()}`;
}

function LaporanPresensiKelompok() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState("2026-07-20");
  const [to, setTo] = useState(today);
  const [kelompokId, setKelompokId] = useState<string>("__all");

  const fetchDash = useServerFn(presensiDashboardKelompok);
  const { data, isFetching } = useQuery({
    queryKey: ["presensi-dashboard-kelompok", from, to, kelompokId],
    queryFn: () => fetchDash({ data: { from, to, kelompokId } }),
  });

  const pieData = useMemo(() => {
    if (!data) return [];
    return (["H", "S", "I", "A", "P"] as const)
      .map((k) => ({ name: k, value: data.totals[k] }))
      .filter((d) => d.value > 0);
  }, [data]);

  const barData = useMemo(() => {
    if (!data) return [];
    return (["H", "S", "I", "A", "P"] as const).map((k) => ({
      name: k, value: data.totals[k], fill: STATUS_COLORS[k],
    }));
  }, [data]);

  const exportCsv = () => {
    if (!data) return;
    const header = ["Tanggal", "Kelompok Belajar", "Pembimbing", "H", "S", "I", "A", "P", "Total"];
    const rows = data.detailRows.map((r: any) => [r.date, r.rombel, r.walikelas, r.H, r.S, r.I, r.A, r.P, r.total]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-presensi-kelompok-${from}-${to}-${todayStamp()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Laporan Presensi Kelompok Belajar</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Rekap kehadiran dikelompokkan berdasarkan Kelompok Belajar pada rentang tanggal.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button onClick={exportCsv} disabled={!data} className="gap-2 flex-1 sm:flex-none">
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Ekspor Data</span> CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 p-4 sm:p-6">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Tanggal Awal</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Akhir</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Kelompok Belajar</Label>
              <Select value={kelompokId} onValueChange={setKelompokId}>
                <SelectTrigger><SelectValue placeholder="Semua Kelompok" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Semua Kelompok</SelectItem>
                  {(data?.konsentrasiList ?? []).map((k: any) => (
                    <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Big stat cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <BigStat icon={<School className="h-6 w-6" />} label="Total Kelompok" value={data?.stats.totalKelas ?? 0}
          gradient="from-blue-500 to-cyan-500" />
        <BigStat icon={<Users className="h-6 w-6" />} label="Total Pembimbing" value={data?.stats.totalPengajar ?? 0}
          gradient="from-pink-500 to-rose-500" />
        <BigStat icon={<GraduationCap className="h-6 w-6" />} label="Total Murid" value={data?.stats.totalMurid ?? 0}
          gradient="from-violet-500 to-purple-600" />
      </div>

      {/* Small stat cards */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        <SmallStat icon={<CalendarCheck className="h-5 w-5" />} label="Total Sesi" value={data?.totals.sesi ?? 0} color="bg-slate-600" />
        <SmallStat icon={<CheckCircle2 className="h-5 w-5" />} label="Total Hadir" value={data?.totals.H ?? 0} color="bg-emerald-500" />
        <SmallStat icon={<Thermometer className="h-5 w-5" />} label="Total Sakit" value={data?.totals.S ?? 0} color="bg-amber-500" />
        <SmallStat icon={<FileText className="h-5 w-5" />} label="Total Izin" value={data?.totals.I ?? 0} color="bg-sky-500" />
        <SmallStat icon={<XCircle className="h-5 w-5" />} label="Total Alpa" value={data?.totals.A ?? 0} color="bg-rose-500" />
        <SmallStat icon={<Briefcase className="h-5 w-5" />} label="Total PKL" value={data?.totals.P ?? 0} color="bg-violet-500" />
        <SmallStat icon={<ClipboardList className="h-5 w-5" />} label="Total Kehadiran" value={data?.totals.kehadiran ?? 0} color="bg-indigo-600" />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><PieIcon className="h-4 w-4 text-primary" /> Statistik Kehadiran</CardTitle>
            <p className="text-xs text-muted-foreground">Distribusi status kehadiran</p>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                    {pieData.map((d) => <Cell key={d.name} fill={STATUS_COLORS[d.name]} />)}
                  </Pie>
                  <RTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Perbandingan Status</CardTitle>
            <p className="text-xs text-muted-foreground">Jumlah per status kehadiran</p>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RTooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {barData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <TrendChart title="Tren Alfa Harian" data={data?.trend ?? []} dataKey="A" color={STATUS_COLORS.A} />
      <TrendChart title="Tren Sakit Harian" data={data?.trend ?? []} dataKey="S" color={STATUS_COLORS.S} />
      <TrendChart title="Tren Izin Harian" data={data?.trend ?? []} dataKey="I" color={STATUS_COLORS.I} />
      <TrendChart title="Tren PKL Harian" data={data?.trend ?? []} dataKey="P" color={STATUS_COLORS.P} />

      <KelompokBelumInputCard />

      {/* Alfa leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <XCircle className="h-4 w-4 text-rose-500" /> Murid dengan Alfa Terbanyak
          </CardTitle>
          <p className="text-xs text-muted-foreground">15 murid dengan jumlah alfa terbanyak dari kelompok belajar dalam rentang tanggal.</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">No</TableHead>
                <TableHead>Nama Murid</TableHead>
                <TableHead>NIS</TableHead>
                <TableHead>Rombel</TableHead>
                <TableHead className="text-center">Jumlah Alfa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.alfaTop ?? []).map((s: any, i: number) => (
                <TableRow key={s.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.nis ?? "-"}</TableCell>
                  <TableCell>{s.rombel}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="destructive">{s.count}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {data && data.alfaTop.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Tidak ada catatan alfa.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DetailPresensiKelompokCard />

      {isFetching && <p className="text-xs text-muted-foreground text-center">Memuat data...</p>}
    </div>
  );
}

function KelompokBelumInputCard() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const fetchFn = useServerFn(kelompokBelumInputByDate);
  const { data, isFetching } = useQuery({
    queryKey: ["kelompok-belum-input", date],
    queryFn: () => fetchFn({ data: { date } }),
  });
  const rows = data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const curPage = Math.min(page, totalPages);
  const start = (curPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Kelompok Belum Input Presensi
            </CardTitle>
            <p className="text-xs text-muted-foreground">Daftar kelompok belajar yang belum ada anggotanya diinput presensi pada tanggal yang dipilih</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Tanggal:</Label>
              <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} className="h-9 w-[160px]" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">No</TableHead>
              <TableHead>Nama Kelompok</TableHead>
              <TableHead>Pembimbing</TableHead>
              <TableHead className="text-right">Jumlah Murid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((r: any, i: number) => (
              <TableRow key={r.id}>
                <TableCell>{start + i + 1}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.walikelas}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary">{r.jumlahMurid} murid</Badge>
                </TableCell>
              </TableRow>
            ))}
            {!isFetching && rows.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Semua kelompok sudah tercatat kehadirannya pada tanggal ini.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Tampilkan</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <span>dari {rows.length} kelompok</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Button variant="outline" size="sm" disabled={curPage <= 1} onClick={() => setPage(curPage - 1)}>‹</Button>
              <span className="text-muted-foreground">Halaman {curPage} dari {totalPages}</span>
              <Button variant="outline" size="sm" disabled={curPage >= totalPages} onClick={() => setPage(curPage + 1)}>›</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BigStat({ icon, label, value, gradient }: { icon: React.ReactNode; label: string; value: number; gradient: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90">{label}</p>
          <p className="text-3xl font-bold mt-1">{value.toLocaleString("id-ID")}</p>
        </div>
        <div className="p-3 rounded-full bg-white/20 backdrop-blur">{icon}</div>
      </div>
    </div>
  );
}

function SmallStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl ${color} p-4 text-white shadow-sm`}>
      <div className="flex items-center gap-2 opacity-90">{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className="text-2xl font-bold mt-2">{value.toLocaleString("id-ID")}</p>
    </div>
  );
}

function TrendChart({ title, data, dataKey, color }: { title: string; data: any[]; dataKey: string; color: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" style={{ color }} /> {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">Grafik tren harian pada rentang tanggal.</p>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer>
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`gradk-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <RTooltip />
              <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#gradk-${dataKey})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailPresensiKelompokCard() {
  const [date, setDate] = useState<string>("");
  const [kelompokId, setKelompokId] = useState<string>("__all");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [view, setView] = useState<{ kelompokId: string; date: string } | null>(null);

  const fetchList = useServerFn(attendanceDetailListKelompok);
  const fetchDash = useServerFn(presensiDashboardKelompok);

  // Load kelompok list from dashboard endpoint (reuse existing wide fetch)
  const refsQuery = useQuery({
    queryKey: ["kelompok-list-detail"],
    queryFn: () => fetchDash({ data: { from: "1970-01-01", to: "1970-01-02", kelompokId: "__all" } }),
  });

  const listQuery = useQuery({
    queryKey: ["detail-presensi-kelompok", date, kelompokId],
    queryFn: () =>
      fetchList({
        data: {
          date: date || null,
          kelompokId: kelompokId !== "__all" ? kelompokId : null,
        },
      }),
  });
  const rows = listQuery.data ?? [];
  const filteredRows = (() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r: any) =>
      [r.officer_name, r.rombel, r.walikelas]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(q))
    );
  })();
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const curPage = Math.min(page, totalPages);
  const start = (curPage - 1) * pageSize;
  const pageRows = filteredRows.slice(start, start + pageSize);

  const resetFilter = () => {
    setDate("");
    setKelompokId("__all");
    setSearch("");
    setPage(1);
  };

  const exportRecap = () => {
    const header = ["Tanggal", "Kelompok Belajar", "Pembimbing", "Petugas Piket", "Hadir", "Sakit", "Izin", "Alfa", "PKL", "Jumlah Murid"];
    const body = rows.map((r: any) => [r.date, r.rombel, r.walikelas, r.officer_name, r.H, r.S, r.I, r.A, r.P, r.jumlahMurid]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap");
    XLSX.writeFile(wb, `rekap-presensi-kelompok-${todayStamp()}.xlsx`);
  };

  const exportDetail = async () => {
    if (rows.length === 0) { toast.info("Tidak ada data untuk diekspor"); return; }
    toast.loading("Menyiapkan ekspor detail...", { id: "exp-detail-kb" });
    try {
      const all: any[] = [];
      for (const r of rows as any[]) {
        const res: any = await attendanceDetailViewKelompok({ data: { kelompokId: r.kelompokId, date: r.date } });
        for (const s of res.students) {
          all.push([r.date, r.rombel, r.walikelas, r.officer_name, s.nis ?? "-", s.name, STATUS_LABEL[s.status] ?? s.status]);
        }
      }
      const header = ["Tanggal", "Kelompok Belajar", "Pembimbing", "Petugas Piket", "NIS", "Nama Murid", "Status"];
      const ws = XLSX.utils.aoa_to_sheet([header, ...all]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Detail");
      XLSX.writeFile(wb, `detail-presensi-kelompok-${todayStamp()}.xlsx`);
      toast.success("Ekspor detail selesai", { id: "exp-detail-kb" });
    } catch (e: any) {
      toast.error(e.message ?? "Gagal ekspor detail", { id: "exp-detail-kb" });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Detail Presensi per Kelompok
            </CardTitle>
            <p className="text-xs text-muted-foreground">Riwayat presensi kelompok belajar dalam periode yang dipilih</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportRecap} className="gap-2">
              <FileDown className="h-4 w-4" /> Export Recap
            </Button>
            <Button variant="outline" size="sm" onClick={exportDetail} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Export Detail
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-3 grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1.5"><CalendarCheck className="h-3.5 w-3.5" /> Tanggal</Label>
            <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} className="h-9 bg-background" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Kelompok Belajar</Label>
            <Select value={kelompokId} onValueChange={(v) => { setKelompokId(v); setPage(1); }}>
              <SelectTrigger className="h-9 bg-background"><SelectValue placeholder="Semua Kelompok" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Semua Kelompok</SelectItem>
                {((refsQuery.data as any)?.konsentrasiList ?? []).map((k: any) => (
                  <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={resetFilter} className="h-9">Reset Filter</Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari cepat: petugas, kelompok, atau pembimbing..."
            className="h-9 pl-9 bg-background"
          />
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Kelompok Belajar</TableHead>
                <TableHead>Pembimbing</TableHead>
                <TableHead>Petugas Piket</TableHead>
                <TableHead className="text-center">Hadir</TableHead>
                <TableHead className="text-center">Sakit</TableHead>
                <TableHead className="text-center">Izin</TableHead>
                <TableHead className="text-center">Alfa</TableHead>
                <TableHead className="text-center">PKL</TableHead>
                <TableHead className="text-center">Jumlah Murid</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{r.date}</TableCell>
                  <TableCell className="font-medium">{r.rombel}</TableCell>
                  <TableCell>{r.walikelas}</TableCell>
                  <TableCell>{r.officer_name}</TableCell>
                  <TableCell className="text-center text-emerald-600 font-medium">{r.H}</TableCell>
                  <TableCell className="text-center text-amber-600">{r.S}</TableCell>
                  <TableCell className="text-center text-sky-600">{r.I}</TableCell>
                  <TableCell className="text-center text-rose-600 font-medium">{r.A}</TableCell>
                  <TableCell className="text-center text-violet-600">{r.P}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{r.jumlahMurid} murid</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-sky-600 hover:text-sky-700"
                        onClick={() => setView({ kelompokId: r.kelompokId, date: r.date })} title="Lihat Detail">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!listQuery.isFetching && filteredRows.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-6">{rows.length === 0 ? "Belum ada catatan presensi kelompok." : "Tidak ada hasil untuk pencarian ini."}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {filteredRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Tampilkan</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <span>dari {filteredRows.length}{search.trim() ? ` (dari total ${rows.length})` : ""} data</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Button variant="outline" size="sm" disabled={curPage <= 1} onClick={() => setPage(curPage - 1)}>‹</Button>
              <span className="text-muted-foreground">Halaman {curPage} dari {totalPages}</span>
              <Button variant="outline" size="sm" disabled={curPage >= totalPages} onClick={() => setPage(curPage + 1)}>›</Button>
            </div>
          </div>
        )}
      </CardContent>

      <ViewKelompokDialog value={view} onClose={() => setView(null)} />
    </Card>
  );
}

function ViewKelompokDialog({ value, onClose }: { value: { kelompokId: string; date: string } | null; onClose: () => void }) {
  const fetchFn = useServerFn(attendanceDetailViewKelompok);
  const { data, isFetching } = useQuery({
    queryKey: ["attendance-view-kelompok", value?.kelompokId, value?.date],
    queryFn: () => fetchFn({ data: { kelompokId: value!.kelompokId, date: value!.date } }),
    enabled: !!value,
  });
  const counts = useMemo(() => {
    const c = { H: 0, S: 0, I: 0, A: 0, P: 0 };
    for (const s of (data?.students ?? []) as any[]) {
      const k = s.status as keyof typeof c;
      if (k in c) c[k]++;
    }
    return c;
  }, [data]);

  return (
    <Dialog open={!!value} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-sky-600" /> Detail Presensi Kelompok</DialogTitle>
          <DialogDescription>
            {data ? `${data.record.rombel_name} — ${formatDateLongID(String(data.record.date))}` : "Memuat..."}
          </DialogDescription>
        </DialogHeader>
        {isFetching || !data ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-[120px_1fr] gap-y-1 text-sm">
              <div className="text-muted-foreground">Petugas Piket:</div>
              <div className="font-medium">{data.record.officer_name}</div>
              <div className="text-muted-foreground">Pembimbing:</div>
              <div className="font-medium">{data.record.wali_kelas}</div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {(["H", "S", "I", "A", "P"] as const).map((k) => (
                <div key={k} className={`rounded-lg border p-3 text-center ${STATUS_BADGE[k]}`}>
                  <div className="text-2xl font-bold">{counts[k]}</div>
                  <div className="text-xs">{STATUS_LABEL[k]}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Daftar Murid ({data.students.length}):</div>
              <div className="max-h-[360px] overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/60 backdrop-blur">
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead className="w-28">NIS</TableHead>
                      <TableHead>Nama Murid</TableHead>
                      <TableHead className="text-right w-24">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.students as any[]).map((s, i) => (
                      <TableRow key={s.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{s.nis ?? "-"}</TableCell>
                        <TableCell className="uppercase">{s.name}</TableCell>
                        <TableCell className="text-right">
                          <span className={`inline-block rounded-md border px-2 py-0.5 text-xs ${STATUS_BADGE[s.status] ?? ""}`}>
                            {STATUS_LABEL[s.status] ?? s.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
