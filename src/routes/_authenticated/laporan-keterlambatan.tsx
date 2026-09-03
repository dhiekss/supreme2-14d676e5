import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useIsMobile } from "@/hooks/use-mobile";

import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { listRombelAll as listRombel } from "@/lib/presensi.functions";
import {
  listKeterlambatan,
  listRombelDirectory,
  deleteKeterlambatan,
} from "@/lib/keterlambatan.functions";
import {
  CalendarIcon,
  Download,
  Filter,
  Clock,
  Users,
  AlertTriangle,
  TrendingUp,
  Building2,
  UsersRound,
  Medal,
  Eye,
  Trash2,
  X,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

export const Route = createFileRoute("/_authenticated/laporan-keterlambatan")({
  head: () => ({ meta: [{ title: "Laporan Keterlambatan — SUPREME XPOES" }] }),
  loader: async () => ({
    rombel: await listRombel(),
    directory: await listRombelDirectory(),
  }),
  component: LaporanKeterlambatanPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

const BULAN_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const fmtID = (d: Date) => `${String(d.getDate()).padStart(2, "0")} ${BULAN_SHORT[d.getMonth()]} ${d.getFullYear()}`;
const toISO = (d: Date) => {
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
};

function LaporanKeterlambatanPage() {
  const { rombel, directory } = Route.useLoaderData();

  // default: last ~2 months
  const initialTo = new Date();
  const initialFrom = new Date();
  initialFrom.setDate(initialFrom.getDate() - 56);
  const [range, setRange] = useState<DateRange | undefined>({ from: initialFrom, to: initialTo });
  const [filterKonsentrasi, setFilterKonsentrasi] = useState<string>("all");
  const [filterRombel, setFilterRombel] = useState<string>("all");
  const [dateOpen, setDateOpen] = useState(false);
  const isMobile = useIsMobile();


  const from = range?.from ? toISO(range.from) : "";
  const to = range?.to ? toISO(range.to) : from;

  const qc = useQueryClient();
  const fetchList = useServerFn(listKeterlambatan);
  const removeFn = useServerFn(deleteKeterlambatan);

  const { data: rowsAll = [], isFetching } = useSuspenseQuery({
    queryKey: ["keterlambatan", from, to],
    queryFn: () => fetchList({ data: { from, to } }),
  });

  const del = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Catatan dihapus");
      qc.invalidateQueries({ queryKey: ["keterlambatan"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Konsentrasi options from directory
  const konsentrasiOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of directory as any[]) if (r.konsentrasi && r.konsentrasi !== "—") s.add(r.konsentrasi);
    return [...s].sort();
  }, [directory]);

  // Rombel filtered by konsentrasi
  const rombelOptions = useMemo(() => {
    const list = rombel as any[];
    if (filterKonsentrasi === "all") return list;
    const kMap = new Map((directory as any[]).map((r) => [r.id, r.konsentrasi]));
    return list.filter((r) => kMap.get(r.id) === filterKonsentrasi);
  }, [rombel, directory, filterKonsentrasi]);

  // Apply konsentrasi + rombel filter client-side
  const rows = useMemo(() => {
    let out = rowsAll as any[];
    if (filterRombel !== "all") out = out.filter((r) => r.rombel_id === filterRombel);
    if (filterKonsentrasi !== "all") out = out.filter((r) => r.konsentrasi === filterKonsentrasi);
    return out;
  }, [rowsAll, filterRombel, filterKonsentrasi]);

  // Stats
  const todayISO = toISO(new Date());
  const stats = useMemo(() => {
    const byStudent = new Map<string, number>();
    let hariIni = 0;
    for (const r of rows) {
      byStudent.set(r.student_id, (byStudent.get(r.student_id) ?? 0) + 1);
      if (r.record_date === todayISO) hariIni++;
    }
    let topName = "—";
    let topCount = 0;
    let topStudentId: string | null = null;
    for (const [sid, c] of byStudent) {
      if (c > topCount) {
        topCount = c;
        topStudentId = sid;
      }
    }
    if (topStudentId) {
      const rec = rows.find((r) => r.student_id === topStudentId);
      topName = rec?.student_name ?? "—";
    }
    return { total: rows.length, murid: byStudent.size, hariIni, topName, topCount };
  }, [rows, todayISO]);

  // Daily trend data (chronological, every day in range)
  const trendData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.record_date, (counts.get(r.record_date) ?? 0) + 1);
    const start = range?.from ? new Date(range.from) : null;
    const end = range?.to ? new Date(range.to) : (range?.from ? new Date(range.from) : null);
    if (!start || !end) return [] as { date: string; label: string; jumlah: number }[];
    const out: { date: string; label: string; jumlah: number }[] = [];
    const d = new Date(start);
    while (d <= end) {
      const iso = toISO(d);
      out.push({ date: iso, label: `${d.getDate()} ${BULAN_SHORT[d.getMonth()]}`, jumlah: counts.get(iso) ?? 0 });
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [rows, range?.from, range?.to]);

  // Rankings — % = late-students / total-students
  const rankKonsentrasi = useMemo(() => {
    // total students per konsentrasi
    const totalPerK = new Map<string, number>();
    for (const r of directory as any[]) {
      totalPerK.set(r.konsentrasi, (totalPerK.get(r.konsentrasi) ?? 0) + r.total_students);
    }
    // late students per konsentrasi
    const lateStudentsPerK = new Map<string, Set<string>>();
    for (const r of rows) {
      const k = r.konsentrasi;
      if (!lateStudentsPerK.has(k)) lateStudentsPerK.set(k, new Set());
      lateStudentsPerK.get(k)!.add(r.student_id);
    }
    const arr = [...lateStudentsPerK.entries()].map(([k, set]) => {
      const total = totalPerK.get(k) ?? 0;
      const late = set.size;
      return { name: k, late, total, pct: total ? (late / total) * 100 : 0 };
    });
    arr.sort((a, b) => b.pct - a.pct);
    return arr;
  }, [rows, directory]);

  const rankRombel = useMemo(() => {
    const totalPerR = new Map<string, { name: string; total: number }>();
    for (const r of directory as any[]) totalPerR.set(r.id, { name: r.name, total: r.total_students });
    const lateStudentsPerR = new Map<string, Set<string>>();
    for (const r of rows) {
      if (!lateStudentsPerR.has(r.rombel_id)) lateStudentsPerR.set(r.rombel_id, new Set());
      lateStudentsPerR.get(r.rombel_id)!.add(r.student_id);
    }
    const arr = [...lateStudentsPerR.entries()].map(([id, set]) => {
      const info = totalPerR.get(id);
      const total = info?.total ?? 0;
      const late = set.size;
      return { id, name: info?.name ?? "—", late, total, pct: total ? (late / total) * 100 : 0 };
    });
    arr.sort((a, b) => b.pct - a.pct);
    return arr;
  }, [rows, directory]);

  // Student-level aggregation for the table
  type StudentAgg = {
    student_id: string;
    student_name: string;
    student_nis: string;
    rombel_id: string;
    rombel_name: string;
    count: number;
    penginput_terakhir: string;
    sp_status: string;
    sp_date: string | null;
    dates: { id: string; date: string; time: string; penginput: string }[];
  };
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [sortBy, setSortBy] = useState<"count" | "name" | "rombel" | "sp">("count");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const students: StudentAgg[] = useMemo(() => {
    const map = new Map<string, StudentAgg>();
    for (const r of rows) {
      const key = r.student_id;
      if (!map.has(key)) {
        map.set(key, {
          student_id: r.student_id,
          student_name: r.student_name,
          student_nis: r.student_nis,
          rombel_id: r.rombel_id,
          rombel_name: r.rombel_name,
          count: 0,
          penginput_terakhir: r.penginput_name,
          sp_status: r.sp_status ?? "Perlu Tindakan Wali Kelas",
          sp_date: r.sp_date ?? null,
          dates: [],
        });
      }
      const agg = map.get(key)!;
      agg.count += 1;
      agg.dates.push({
        id: r.id,
        date: r.record_date,
        time: r.recorded_at ? new Date(r.recorded_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-",
        penginput: r.penginput_name,
      });
    }
    // dates are already sorted DESC because rows come sorted; first = latest
    for (const a of map.values()) a.penginput_terakhir = a.dates[0]?.penginput ?? "—";
    const arr = [...map.values()];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "count") cmp = a.count - b.count;
      else if (sortBy === "name") cmp = a.student_name.localeCompare(b.student_name);
      else if (sortBy === "sp") cmp = a.sp_status.localeCompare(b.sp_status);
      else cmp = a.rombel_name.localeCompare(b.rombel_name);
      return sortDir === "desc" ? -cmp : cmp;
    });
    return arr;
  }, [rows, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(students.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const pageRows = students.slice((pageClamped - 1) * pageSize, pageClamped * pageSize);

  const [detail, setDetail] = useState<StudentAgg | null>(null);

  const resetFilter = () => {
    setRange({ from: initialFrom, to: initialTo });
    setFilterKonsentrasi("all");
    setFilterRombel("all");
    setPage(1);
  };

  const exportExcel = () => {
    const data = students.map((s, i) => ({
      No: i + 1,
      Nama: s.student_name,
      NIS: s.student_nis,
      Rombel: s.rombel_name,
      "Total Terlambat": s.count,
      "Status SP": s.sp_status,
      "Tanggal Tindakan/SP": s.sp_date ?? "-",
      "Penginput Terakhir": s.penginput_terakhir,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 5 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 26 }, { wch: 20 }, { wch: 24 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, `laporan-keterlambatan_${from}_sd_${to}.xlsx`);
    toast.success("File Excel diunduh");
  };

  const toggleSort = (col: "count" | "name" | "rombel" | "sp") => {
    if (sortBy === col) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const rangeLabel = range?.from
    ? range.to && toISO(range.to) !== toISO(range.from)
      ? `${fmtID(range.from)} — ${fmtID(range.to)}`
      : fmtID(range.from)
    : "Pilih tanggal";

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Laporan Keterlambatan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Statistik dan data murid yang terlambat
          </p>
        </div>
        <Button variant="outline" onClick={exportExcel} disabled={students.length === 0} className="shrink-0">
          <Download className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Export Excel</span>
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filter Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Rentang Tanggal</label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start font-normal", !range?.from && "text-muted-foreground")}>
                    <CalendarIcon className="h-4 w-4 mr-2 text-primary shrink-0" />
                    <span className="truncate">{rangeLabel}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    numberOfMonths={isMobile ? 1 : 2}
                    selected={range}
                    onSelect={(v) => { setRange(v); setPage(1); }}
                    defaultMonth={range?.from}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Konsentrasi Keahlian</label>
              <Select value={filterKonsentrasi} onValueChange={(v) => { setFilterKonsentrasi(v); setFilterRombel("all"); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Konsentrasi</SelectItem>
                  {konsentrasiOptions.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Rombel</label>
              <Select value={filterRombel} onValueChange={(v) => { setFilterRombel(v); setPage(1); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Rombel</SelectItem>
                  {rombelOptions.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex sm:items-end">
              <Button variant="ghost" onClick={resetFilter} className="text-muted-foreground w-full sm:w-auto">
                <X className="h-4 w-4 mr-1" /> Reset
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-muted-foreground">Filter aktif:</span>
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10">
              {rangeLabel}
            </Badge>
            {filterKonsentrasi !== "all" && (
              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10">{filterKonsentrasi}</Badge>
            )}
            {filterRombel !== "all" && (
              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10">
                {(rombel as any[]).find((r) => r.id === filterRombel)?.name}
              </Badge>
            )}
            {isFetching && <span className="text-muted-foreground">(memuat…)</span>}
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Keterlambatan" value={String(stats.total)} icon={<Clock className="h-8 w-8" />}
          className="bg-gradient-to-br from-blue-500 to-blue-600" />
        <StatCard label="Murid Terlambat" value={String(stats.murid)} icon={<Users className="h-8 w-8" />}
          className="bg-gradient-to-br from-orange-400 to-orange-500" />
        <StatCard label="Hari Ini" value={String(stats.hariIni)} icon={<AlertTriangle className="h-8 w-8" />}
          className="bg-gradient-to-br from-rose-500 to-red-500" />
        <StatCard label="Terbanyak" value={stats.topName} subValue={stats.topCount ? `${stats.topCount}x` : "—"}
          icon={<TrendingUp className="h-8 w-8" />}
          className="bg-gradient-to-br from-violet-500 to-purple-600" />
      </div>

      {/* Daily trend chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" /> Tren Keterlambatan Harian
          </CardTitle>
          <p className="text-xs text-muted-foreground">{rangeLabel}</p>
        </CardHeader>
        <CardContent>
          {trendData.every((d) => d.jumlah === 0) ? (
            <div className="text-center text-sm text-muted-foreground py-10">Belum ada data keterlambatan pada rentang ini.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={30} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                  <Tooltip
                    formatter={(v: any) => [`${v} murid`, "Terlambat"]}
                    labelFormatter={(l: any) => l}
                  />
                  <Line type="monotone" dataKey="jumlah" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} name="Terlambat" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rankings */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <RankingCard title="Ranking Konsentrasi Keahlian" icon={<Building2 className="h-4 w-4 text-blue-500" />}
          items={rankKonsentrasi.slice(0, 3).map((r) => ({ label: r.name, sub: `${r.late} dari ${r.total} murid`, pct: r.pct }))}
          more={rankKonsentrasi.length > 3 ? rankKonsentrasi.length - 3 : 0} />
        <RankingCard title="Ranking Rombel" icon={<UsersRound className="h-4 w-4 text-blue-500" />}
          items={rankRombel.slice(0, 3).map((r) => ({ label: r.name, sub: `${r.late} dari ${r.total} murid`, pct: r.pct }))}
          more={rankRombel.length > 3 ? rankRombel.length - 3 : 0} />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-base sm:text-lg">Daftar Murid Terlambat</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Tampilkan:</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">No</TableHead>
                  <TableHead>
                    <button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 hover:text-foreground">
                      Nama Murid <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>NIS</TableHead>
                  <TableHead>
                    <button onClick={() => toggleSort("rombel")} className="inline-flex items-center gap-1 hover:text-foreground">
                      Rombel <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => toggleSort("count")} className="inline-flex items-center gap-1 hover:text-foreground whitespace-nowrap">
                      Total Terlambat <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Penginput Terakhir</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">Tidak ada data</TableCell></TableRow>
                ) : pageRows.map((s, i) => (
                  <TableRow key={s.student_id}>
                    <TableCell className="text-muted-foreground">{(pageClamped - 1) * pageSize + i + 1}</TableCell>
                    <TableCell className="font-semibold whitespace-nowrap">{s.student_name}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{s.student_nis}</TableCell>
                    <TableCell className="whitespace-nowrap">{s.rombel_name}</TableCell>
                    <TableCell>
                      <Badge className="bg-rose-100 text-rose-600 hover:bg-rose-100 rounded-full">{s.count}x</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{s.penginput_terakhir}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setDetail(s)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {students.length > 0 && (
            <div className="flex items-center justify-center gap-1 p-3 border-t flex-wrap">
              <Button size="sm" variant="ghost" disabled={pageClamped === 1} onClick={() => setPage(pageClamped - 1)}>‹</Button>
              {getPageNumbers(pageClamped, totalPages).map((p, idx) =>
                p === "…" ? (
                  <span key={idx} className="px-1 text-muted-foreground">…</span>
                ) : (
                  <Button key={idx} size="sm" variant={p === pageClamped ? "default" : "ghost"} onClick={() => setPage(p as number)}
                    className={cn("w-8 h-8 p-0", p === pageClamped && "bg-primary text-primary-foreground")}>
                    {p}
                  </Button>
                ),
              )}
              <Button size="sm" variant="ghost" disabled={pageClamped === totalPages} onClick={() => setPage(pageClamped + 1)}>›</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Riwayat Keterlambatan</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="text-sm">
                <div className="font-semibold">{detail.student_name}</div>
                <div className="text-muted-foreground">NIS {detail.student_nis} · {detail.rombel_name}</div>
                <div className="mt-1">Total: <span className="font-semibold">{detail.count}x</span></div>
              </div>
              <div className="max-h-80 overflow-auto rounded-md border">
                <Table className="min-w-[380px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Jam</TableHead>
                      <TableHead>Penginput</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.dates.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.date}</TableCell>
                        <TableCell>{d.time}</TableCell>
                        <TableCell className="text-muted-foreground">{d.penginput}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => { if (confirm("Hapus catatan ini?")) del.mutate(d.id); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label, value, subValue, icon, className,
}: { label: string; value: string; subValue?: string; icon: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl p-5 text-white shadow-md", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs opacity-90">{label}</div>
          <div className="text-2xl font-bold truncate mt-1">{value}</div>
          {subValue && <div className="text-xs opacity-90 mt-0.5">{subValue}</div>}
        </div>
        <div className="opacity-90 shrink-0">{icon}</div>
      </div>
    </div>
  );
}

const MEDAL_COLORS = ["text-amber-500 bg-amber-100", "text-slate-500 bg-slate-100", "text-orange-700 bg-orange-100"];

function RankingCard({
  title, icon, items, more,
}: { title: string; icon: React.ReactNode; items: { label: string; sub: string; pct: number }[]; more: number }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">{icon} {title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Belum ada data</div>
        ) : items.map((it, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", MEDAL_COLORS[i] ?? "bg-muted text-muted-foreground")}>
              <Medal className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate">{it.label}</div>
              <div className="text-xs text-muted-foreground">{it.sub}</div>
            </div>
            <Badge className="bg-rose-500 text-white hover:bg-rose-500 rounded-full">{it.pct.toFixed(1)}%</Badge>
          </div>
        ))}
        {more > 0 && (
          <button className="w-full mt-1 rounded-lg border py-2 text-sm text-muted-foreground hover:bg-muted/50 flex items-center justify-center gap-2">
            <Eye className="h-4 w-4" /> Lihat Selengkapnya ({more})
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [];
  const push = (v: number | "…") => pages.push(v);
  push(1);
  if (current > 3) push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) push(p);
  if (current < total - 2) push("…");
  push(total);
  return pages;
}
