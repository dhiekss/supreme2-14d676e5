import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  presensiDashboard,
  rombelBelumInputByDate,
  attendanceDetailList,
  attendanceDetailView,
  deleteAttendanceRecord,
  listOfficers,
} from "@/lib/presensi-report.functions";
import { listRombel, saveAttendance } from "@/lib/presensi.functions";
import { importAttendance } from "@/lib/presensi-import.functions";
import { todayStamp } from "@/lib/utils";
import {
  Download, Users, GraduationCap, School, CalendarCheck, CheckCircle2,
  Thermometer, FileText, XCircle, Briefcase, ClipboardList, AlertTriangle,
  TrendingUp, PieChart as PieIcon, BarChart3, Upload, FileSpreadsheet, Loader2,
  Eye, Pencil, Trash2, Filter, FileDown, Search,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
} from "recharts";

export const Route = createFileRoute("/_authenticated/laporan-presensi")({
  head: () => ({ meta: [{ title: "Laporan Presensi — SUPREME XPOES" }] }),
  component: LaporanPresensi,
  errorComponent: ({ error }) => <div className="text-destructive p-4">Gagal: {error.message}</div>,
});

const STATUS_COLORS: Record<string, string> = {
  H: "hsl(142 71% 45%)",
  S: "hsl(38 92% 50%)",
  I: "hsl(210 90% 55%)",
  A: "hsl(0 84% 60%)",
  P: "hsl(270 70% 60%)",
};

function LaporanPresensi() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [konsentrasi, setKonsentrasi] = useState<string>("__all");

  const fetchDash = useServerFn(presensiDashboard);
  const { data, isFetching } = useQuery({
    queryKey: ["presensi-dashboard", from, to, konsentrasi],
    queryFn: () => fetchDash({ data: { from, to, konsentrasi } }),
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
    const header = ["Tanggal", "Rombel", "Wali Kelas", "H", "S", "I", "A", "P", "Total"];
    const rows = data.detailRows.map((r) => [r.date, r.rombel, r.walikelas, r.H, r.S, r.I, r.A, r.P, r.total]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-presensi-${from}-${to}-${todayStamp()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Template & Import ----
  const qc = useQueryClient();
  const importFn = useServerFn(importAttendance);
  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [parsedRows, setParsedRows] = useState<any[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const downloadTemplate = () => {
    const header = ["Tanggal", "Rombel", "Wali Kelas", "Petugas Piket", "Nama Murid", "NIS", "Status"];
    const sample = [
      ["22/06/2026", "X AGRITAN A", "Ahmad Zaeni, S.P., Gr", "Perwakilan X AGRITAN A", "ABDUL ROHMAT", "25.01.001", "HADIR"],
      ["22/06/2026", "X AGRITAN A", "Ahmad Zaeni, S.P., Gr", "Perwakilan X AGRITAN A", "ABESTIAN NURISKI", "25.01.002", "SAKIT"],
    ];
    const ws = XLSX.utils.aoa_to_sheet([header, ...sample]);
    (ws as any)["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 24 }, { wch: 24 }, { wch: 28 }, { wch: 14 }, { wch: 10 }];
    const notes = XLSX.utils.aoa_to_sheet([
      ["Petunjuk Pengisian"],
      [""],
      ["Kolom", "Keterangan"],
      ["Tanggal", "Format DD/MM/YYYY atau YYYY-MM-DD"],
      ["Rombel", "Nama rombel persis seperti di aplikasi (mis. X AGRITAN A)"],
      ["Wali Kelas", "Opsional (tidak disimpan; hanya untuk referensi)"],
      ["Petugas Piket", "Nama petugas piket yang menginput"],
      ["Nama Murid", "Nama lengkap murid sesuai data"],
      ["NIS", "NIS murid (disarankan diisi untuk kecocokan pasti)"],
      ["Status", "HADIR / SAKIT / IZIN / ALFA / PKL (atau H, S, I, A, P)"],
    ]);
    (notes as any)["!cols"] = [{ wch: 18 }, { wch: 70 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.utils.book_append_sheet(wb, notes, "Petunjuk");
    XLSX.writeFile(wb, `template-import-presensi.xlsx`);
  };

  const normalizeStatus = (s: string): "H" | "S" | "I" | "A" | "P" | null => {
    const v = String(s ?? "").trim().toUpperCase();
    if (["H", "HADIR"].includes(v)) return "H";
    if (["S", "SAKIT"].includes(v)) return "S";
    if (["I", "IZIN"].includes(v)) return "I";
    if (["A", "ALFA", "ALPA", "ALPHA"].includes(v)) return "A";
    if (["P", "PKL"].includes(v)) return "P";
    return null;
  };

  const parseDate = (v: any): string | null => {
    if (v == null || v === "") return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === "number") {
      // Excel serial date
      const d = XLSX.SSF.parse_date_code(v);
      if (!d) return null;
      const iso = new Date(Date.UTC(d.y, d.m - 1, d.d)).toISOString().slice(0, 10);
      return iso;
    }
    const s = String(v).trim();
    // DD/MM/YYYY
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const dd = m[1].padStart(2, "0"); const mm = m[2].padStart(2, "0"); const yy = m[3];
      return `${yy}-${mm}-${dd}`;
    }
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return null;
  };

  const handleFile = async (file: File) => {
    setParseError(null); setParsedRows(null); setImportResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const wsName = wb.SheetNames.find((n) => n.toLowerCase().includes("data")) ?? wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const rows: any[] = [];
      const bad: string[] = [];
      json.forEach((r, i) => {
        const rowNo = i + 2;
        const tanggal = parseDate(r["Tanggal"] ?? r["tanggal"]);
        const rombel_name = String(r["Rombel"] ?? r["rombel"] ?? "").trim();
        const officer_name = String(r["Petugas Piket"] ?? r["petugas piket"] ?? r["Petugas"] ?? "").trim();
        const student_name = String(r["Nama Murid"] ?? r["nama murid"] ?? r["Nama"] ?? "").trim();
        const nis = String(r["NIS"] ?? r["nis"] ?? "").trim();
        const status = normalizeStatus(r["Status"] ?? r["status"]);
        if (!tanggal) { bad.push(`Baris ${rowNo}: Tanggal tidak valid`); return; }
        if (!rombel_name) { bad.push(`Baris ${rowNo}: Rombel kosong`); return; }
        if (!officer_name) { bad.push(`Baris ${rowNo}: Petugas Piket kosong`); return; }
        if (!student_name) { bad.push(`Baris ${rowNo}: Nama Murid kosong`); return; }
        if (!status) { bad.push(`Baris ${rowNo}: Status tidak dikenali`); return; }
        rows.push({ tanggal, rombel_name, officer_name, student_name, nis: nis || null, status });
      });
      if (rows.length === 0) {
        setParseError(bad.length ? bad.slice(0, 5).join("; ") : "File tidak berisi data.");
        return;
      }
      setParsedRows(rows);
      if (bad.length) toast.warning(`${bad.length} baris dilewati saat validasi lokal.`);
    } catch (e: any) {
      setParseError(e.message ?? "Gagal membaca file");
    }
  };

  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);

  const CHUNK_SIZE = 2000;

  const buildBatches = (rows: any[]): any[][] => {
    // Group rows by (rombel|tanggal) so we never split a group across batches
    // (the server deletes existing details when re-importing the same group).
    const groups = new Map<string, any[]>();
    for (const r of rows) {
      const k = `${r.rombel_name}|${r.tanggal}`;
      const arr = groups.get(k) ?? [];
      arr.push(r);
      groups.set(k, arr);
    }
    const batches: any[][] = [];
    let cur: any[] = [];
    for (const g of groups.values()) {
      if (cur.length + g.length > CHUNK_SIZE && cur.length > 0) {
        batches.push(cur);
        cur = [];
      }
      // If a single group is larger than CHUNK_SIZE, still send it whole
      // (bounded by server max of 10000 rows).
      cur.push(...g);
    }
    if (cur.length) batches.push(cur);
    return batches;
  };

  const importMut = useMutation({
    mutationFn: async () => {
      const batches = buildBatches(parsedRows!);
      setImportProgress({ done: 0, total: batches.length });
      const agg = {
        ok: true,
        recordsCreated: 0,
        recordsUpdated: 0,
        detailsInserted: 0,
        totalGroups: 0,
        totalRows: 0,
        errors: [] as Array<{ row: number; reason: string }>,
      };
      for (let i = 0; i < batches.length; i++) {
        const res: any = await importFn({ data: { rows: batches[i] } });
        agg.recordsCreated += res.recordsCreated ?? 0;
        agg.recordsUpdated += res.recordsUpdated ?? 0;
        agg.detailsInserted += res.detailsInserted ?? 0;
        agg.totalGroups += res.totalGroups ?? 0;
        agg.totalRows += res.totalRows ?? 0;
        if (Array.isArray(res.errors)) agg.errors.push(...res.errors);
        setImportProgress({ done: i + 1, total: batches.length });
      }
      return agg;
    },
    onSuccess: (res: any) => {
      setImportResult(res);
      setImportProgress(null);
      toast.success(`Berhasil: ${res.recordsCreated} record baru, ${res.recordsUpdated} diperbarui, ${res.detailsInserted} detail.`);
      qc.invalidateQueries({ queryKey: ["presensi-dashboard"] });
    },
    onError: (e: any) => { setImportProgress(null); toast.error(e.message); },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan Presensi</h1>
          <p className="text-sm text-muted-foreground">Rekap kehadiran seluruh rombel dalam rentang tanggal.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadTemplate} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Unduh Template
          </Button>
          <Dialog open={importOpen} onOpenChange={(o) => { setImportOpen(o); if (!o) { setParsedRows(null); setParseError(null); setImportResult(null); setImportProgress(null); } }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><Upload className="h-4 w-4" /> Import Record</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Record Presensi</DialogTitle>
                <DialogDescription>
                  Unggah berkas Excel/CSV sesuai template. Baris dengan Rombel/Murid tak dikenal akan dilewati dan dilaporkan.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0]; if (f) handleFile(f);
                  }}
                />
                {parseError && <p className="text-sm text-destructive">{parseError}</p>}
                {parsedRows && !importResult && (
                  <div className="text-sm rounded-md border p-3 bg-muted/30 space-y-1">
                    <div>Siap diimpor: <b>{parsedRows.length.toLocaleString("id-ID")}</b> baris.</div>
                    <div className="text-xs text-muted-foreground">
                      Akan dikirim dalam <b>{buildBatches(parsedRows).length}</b> batch (maks {CHUNK_SIZE.toLocaleString("id-ID")} baris/batch). Data pada tanggal & rombel yang sama akan menimpa record yang ada.
                    </div>
                    {importProgress && (
                      <div className="mt-2">
                        <div className="text-xs mb-1">Memproses batch {importProgress.done} / {importProgress.total}…</div>
                        <div className="h-2 w-full bg-muted rounded overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {importResult && (
                  <div className="text-sm rounded-md border p-3 space-y-1">
                    <div>Record baru: <b>{importResult.recordsCreated}</b></div>
                    <div>Record diperbarui: <b>{importResult.recordsUpdated}</b></div>
                    <div>Total detail tersimpan: <b>{importResult.detailsInserted}</b></div>
                    {importResult.errors?.length > 0 && (
                      <div className="mt-2">
                        <div className="font-medium text-destructive">Peringatan ({importResult.errors.length}):</div>
                        <ul className="list-disc pl-5 max-h-40 overflow-auto">
                          {importResult.errors.slice(0, 50).map((e: any, i: number) => (
                            <li key={i}>{e.row ? `Baris ${e.row}: ` : ""}{e.reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setImportOpen(false)}>Tutup</Button>
                <Button
                  onClick={() => importMut.mutate()}
                  disabled={!parsedRows || importMut.isPending}
                  className="gap-2"
                >
                  {importMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Import {parsedRows ? `(${parsedRows.length})` : ""}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={exportCsv} disabled={!data} className="gap-2">
            <Download className="h-4 w-4" /> Ekspor Data CSV
          </Button>
        </div>
      </div>


      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Tanggal Awal</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Akhir</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Konsentrasi Keahlian</Label>
              <Select value={konsentrasi} onValueChange={setKonsentrasi}>
                <SelectTrigger><SelectValue placeholder="Semua Konsentrasi" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Semua Konsentrasi</SelectItem>
                  {(data?.konsentrasiList ?? []).map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Big colorful stat cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <BigStat icon={<School className="h-6 w-6" />} label="Total Kelas" value={data?.stats.totalKelas ?? 0}
          gradient="from-blue-500 to-cyan-500" />
        <BigStat icon={<Users className="h-6 w-6" />} label="Total Pengajar" value={data?.stats.totalPengajar ?? 0}
          gradient="from-pink-500 to-rose-500" />
        <BigStat icon={<GraduationCap className="h-6 w-6" />} label="Total Murid" value={data?.stats.totalMurid ?? 0}
          gradient="from-violet-500 to-purple-600" />
      </div>

      {/* Small stat cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        <SmallStat icon={<CalendarCheck className="h-5 w-5" />} label="Total Sesi" value={data?.totals.sesi ?? 0} color="bg-slate-600" />
        <SmallStat icon={<CheckCircle2 className="h-5 w-5" />} label="Total Hadir" value={data?.totals.H ?? 0} color="bg-emerald-500" />
        <SmallStat icon={<Thermometer className="h-5 w-5" />} label="Total Sakit" value={data?.totals.S ?? 0} color="bg-amber-500" />
        <SmallStat icon={<FileText className="h-5 w-5" />} label="Total Izin" value={data?.totals.I ?? 0} color="bg-sky-500" />
        <SmallStat icon={<XCircle className="h-5 w-5" />} label="Total Alpa" value={data?.totals.A ?? 0} color="bg-rose-500" />
        <SmallStat icon={<Briefcase className="h-5 w-5" />} label="Total PKL" value={data?.totals.P ?? 0} color="bg-violet-500" />
        <SmallStat icon={<ClipboardList className="h-5 w-5" />} label="Total Kehadiran" value={data?.totals.kehadiran ?? 0} color="bg-indigo-600" />
      </div>

      {/* Donut + Bar */}
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

      {/* Trends */}
      <TrendChart title="Tren Alfa Harian" data={data?.trend ?? []} dataKey="A" color={STATUS_COLORS.A} />
      <TrendChart title="Tren Sakit Harian" data={data?.trend ?? []} dataKey="S" color={STATUS_COLORS.S} />
      <TrendChart title="Tren Izin Harian" data={data?.trend ?? []} dataKey="I" color={STATUS_COLORS.I} />
      <TrendChart title="Tren PKL Harian" data={data?.trend ?? []} dataKey="P" color={STATUS_COLORS.P} />

      {/* Rombel belum input pada tanggal tertentu */}
      <RombelBelumInputCard />


      {/* Alfa leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <XCircle className="h-4 w-4 text-rose-500" /> Murid dengan Alfa Terbanyak
          </CardTitle>
          <p className="text-xs text-muted-foreground">15 murid dengan jumlah alfa terbanyak pada rentang tanggal.</p>
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

      {/* Detail presensi */}
      <DetailPresensiCard />


      {isFetching && <p className="text-xs text-muted-foreground text-center">Memuat data...</p>}
    </div>
  );
}

function RombelBelumInputCard() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [tingkat, setTingkat] = useState<string>("__all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const fetchFn = useServerFn(rombelBelumInputByDate);
  const { data, isFetching } = useQuery({
    queryKey: ["rombel-belum-input", date, tingkat],
    queryFn: () => fetchFn({ data: { date, tingkat } }),
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
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Rombel Belum Input Presensi
            </CardTitle>
            <p className="text-xs text-muted-foreground">Daftar rombel yang belum menginput presensi pada tanggal yang dipilih</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Tanggal:</Label>
              <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} className="h-9 w-[160px]" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Tingkat:</Label>
              <Select value={tingkat} onValueChange={(v) => { setTingkat(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Semua</SelectItem>
                  {(data?.tingkatList ?? []).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">No</TableHead>
              <TableHead>Nama Rombel</TableHead>
              <TableHead>Wali Kelas</TableHead>
              <TableHead className="text-right">Jumlah Murid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((r, i) => (
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
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Semua rombel telah input presensi pada tanggal ini.</TableCell></TableRow>
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
              <span>dari {rows.length} rombel</span>
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
                <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <RTooltip />
              <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

const STATUS_LABEL: Record<string, string> = { H: "Hadir", S: "Sakit", I: "Izin", A: "Alfa", P: "PKL" };
const STATUS_BADGE: Record<string, string> = {
  H: "bg-emerald-50 text-emerald-700 border-emerald-200",
  S: "bg-amber-50 text-amber-700 border-amber-200",
  I: "bg-sky-50 text-sky-700 border-sky-200",
  A: "bg-rose-50 text-rose-700 border-rose-200",
  P: "bg-violet-50 text-violet-700 border-violet-200",
};
const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
function formatDateLongID(iso: string) {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y) return iso;
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return `${DAYS_ID[dt.getDay()]}, ${dt.getDate()} ${MONTHS_ID[dt.getMonth()]} ${dt.getFullYear()}`;
}

function DetailPresensiCard() {
  const [date, setDate] = useState<string>("");
  const [rombelId, setRombelId] = useState<string>("__all");
  const [officer, setOfficer] = useState<string>("__all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewId, setViewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const qc = useQueryClient();
  const fetchList = useServerFn(attendanceDetailList);
  const fetchRombel = useServerFn(listRombel);
  const fetchOfficers = useServerFn(listOfficers);
  const delFn = useServerFn(deleteAttendanceRecord);

  const rombelQuery = useQuery({ queryKey: ["rombel-list-detail"], queryFn: () => fetchRombel() });
  const officersQuery = useQuery({ queryKey: ["officers-list"], queryFn: () => fetchOfficers() });

  const listQuery = useQuery({
    queryKey: ["detail-presensi", date, rombelId, officer],
    queryFn: () =>
      fetchList({
        data: {
          date: date || null,
          rombelId: rombelId !== "__all" ? rombelId : null,
          officer: officer !== "__all" ? officer : null,
        },
      }),
  });
  const rows = listQuery.data ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const curPage = Math.min(page, totalPages);
  const start = (curPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  const resetFilter = () => {
    setDate("");
    setRombelId("__all");
    setOfficer("__all");
    setPage(1);
  };

  const exportRecap = () => {
    const header = ["Tanggal", "Rombel", "Wali Kelas", "Petugas Piket", "Hadir", "Sakit", "Izin", "Alfa", "PKL", "Jumlah Murid"];
    const body = rows.map((r) => [r.date, r.rombel, r.walikelas, r.officer_name, r.H, r.S, r.I, r.A, r.P, r.jumlahMurid]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap");
    XLSX.writeFile(wb, `rekap-presensi-${todayStamp()}.xlsx`);
  };

  const exportDetail = async () => {
    if (rows.length === 0) {
      toast.info("Tidak ada data untuk diekspor");
      return;
    }
    toast.loading("Menyiapkan ekspor detail...", { id: "exp-detail" });
    try {
      const viewFn = attendanceDetailView;
      const all: any[] = [];
      for (const r of rows) {
        const res: any = await viewFn({ data: { recordId: r.id } });
        for (const s of res.students) {
          all.push([r.date, r.rombel, r.walikelas, r.officer_name, s.nis ?? "-", s.name, STATUS_LABEL[s.status] ?? s.status]);
        }
      }
      const header = ["Tanggal", "Rombel", "Wali Kelas", "Petugas Piket", "NIS", "Nama Murid", "Status"];
      const ws = XLSX.utils.aoa_to_sheet([header, ...all]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Detail");
      XLSX.writeFile(wb, `detail-presensi-${todayStamp()}.xlsx`);
      toast.success("Ekspor detail selesai", { id: "exp-detail" });
    } catch (e: any) {
      toast.error(e.message ?? "Gagal ekspor detail", { id: "exp-detail" });
    }
  };

  const doDelete = async () => {
    if (!deleteId) return;
    try {
      await delFn({ data: { recordId: deleteId } });
      toast.success("Data presensi dihapus");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["detail-presensi"] });
      qc.invalidateQueries({ queryKey: ["presensi-dashboard"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Detail Presensi
            </CardTitle>
            <p className="text-xs text-muted-foreground">Riwayat presensi dalam periode yang dipilih</p>
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
        <div className="rounded-lg border bg-muted/30 p-3 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] items-end">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1.5"><CalendarCheck className="h-3.5 w-3.5" /> Tanggal</Label>
            <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} className="h-9 bg-background" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Rombel</Label>
            <Select value={rombelId} onValueChange={(v) => { setRombelId(v); setPage(1); }}>
              <SelectTrigger className="h-9 bg-background"><SelectValue placeholder="Semua Rombel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Semua Rombel</SelectItem>
                {(rombelQuery.data ?? []).map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.tingkat ? `${r.tingkat} — ` : ""}{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1.5"><Filter className="h-3.5 w-3.5" /> Petugas Piket</Label>
            <Select value={officer} onValueChange={(v) => { setOfficer(v); setPage(1); }}>
              <SelectTrigger className="h-9 bg-background"><SelectValue placeholder="Semua Petugas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Semua Petugas</SelectItem>
                {(officersQuery.data ?? []).map((o: string) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={resetFilter} className="h-9">Reset Filter</Button>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Rombel</TableHead>
                <TableHead>Wali Kelas</TableHead>
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
              {pageRows.map((r) => (
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
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-sky-600 hover:text-sky-700" onClick={() => setViewId(r.id)} title="Lihat Detail">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700" onClick={() => setEditId(r.id)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600 hover:text-rose-700" onClick={() => setDeleteId(r.id)} title="Hapus">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!listQuery.isFetching && rows.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-6">Belum ada catatan presensi.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Tampilkan</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <span>dari {rows.length} data</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Button variant="outline" size="sm" disabled={curPage <= 1} onClick={() => setPage(curPage - 1)}>‹</Button>
              <span className="text-muted-foreground">Halaman {curPage} dari {totalPages}</span>
              <Button variant="outline" size="sm" disabled={curPage >= totalPages} onClick={() => setPage(curPage + 1)}>›</Button>
            </div>
          </div>
        )}
      </CardContent>

      <ViewDetailDialog recordId={viewId} onClose={() => setViewId(null)} />
      <EditDetailDialog recordId={editId} onClose={() => setEditId(null)} />

      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Data Presensi</DialogTitle>
            <DialogDescription>Data presensi ini akan dihapus permanen. Lanjutkan?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={doDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ViewDetailDialog({ recordId, onClose }: { recordId: string | null; onClose: () => void }) {
  const fetchFn = useServerFn(attendanceDetailView);
  const { data, isFetching } = useQuery({
    queryKey: ["attendance-view", recordId],
    queryFn: () => fetchFn({ data: { recordId: recordId! } }),
    enabled: !!recordId,
  });
  const counts = useMemo(() => {
    const c = { H: 0, S: 0, I: 0, A: 0, P: 0 };
    for (const s of data?.students ?? []) {
      const k = s.status as keyof typeof c;
      if (k in c) c[k]++;
    }
    return c;
  }, [data]);

  return (
    <Dialog open={!!recordId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-sky-600" /> Detail Presensi</DialogTitle>
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
              <div className="text-muted-foreground">Wali Kelas:</div>
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
              <div className="text-sm font-medium mb-2">Daftar Siswa:</div>
              <div className="max-h-[360px] overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/60 backdrop-blur">
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead className="w-28">NIS</TableHead>
                      <TableHead>Nama Siswa</TableHead>
                      <TableHead className="text-right w-24">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.students.map((s, i) => (
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

function EditDetailDialog({ recordId, onClose }: { recordId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const fetchFn = useServerFn(attendanceDetailView);
  const saveFn = useServerFn(saveAttendance);
  const { data, isFetching } = useQuery({
    queryKey: ["attendance-edit", recordId],
    queryFn: () => fetchFn({ data: { recordId: recordId! } }),
    enabled: !!recordId,
  });
  const [officerName, setOfficerName] = useState("");
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data) return;
    setOfficerName(data.record.officer_name ?? "");
    const m: Record<string, string> = {};
    for (const s of data.students) m[s.id] = s.status;
    setStatuses(m);
  }, [data]);

  const mut = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          rombelId: data!.record.rombel_id!,
          date: String(data!.record.date),
          officerName: officerName || "-",
          entries: Object.entries(statuses).map(([studentId, status]) => ({ studentId, status: status as any })),
        },
      }),
    onSuccess: () => {
      toast.success("Perubahan tersimpan");
      qc.invalidateQueries({ queryKey: ["detail-presensi"] });
      qc.invalidateQueries({ queryKey: ["presensi-dashboard"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!recordId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Data Presensi</DialogTitle>
          <DialogDescription>
            {data ? `${formatDateLongID(String(data.record.date))} — ${data.record.rombel_name}` : "Memuat..."}
          </DialogDescription>
        </DialogHeader>
        {isFetching || !data ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat...</div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm">Petugas Piket</Label>
              <Input value={officerName} onChange={(e) => setOfficerName(e.target.value)} />
            </div>
            <div className="max-h-[420px] overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/60 backdrop-blur">
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Nama Murid</TableHead>
                    <TableHead className="w-32">NIS</TableHead>
                    <TableHead className="text-right w-32">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.students.map((s, i) => (
                    <TableRow key={s.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="uppercase">{s.name}</TableCell>
                      <TableCell className="font-mono text-xs">{s.nis ?? "-"}</TableCell>
                      <TableCell>
                        <Select
                          value={statuses[s.id] ?? "H"}
                          onValueChange={(v) => setStatuses((p) => ({ ...p, [s.id]: v }))}
                        >
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(["H", "S", "I", "A", "P"] as const).map((k) => (
                              <SelectItem key={k} value={k}>{STATUS_LABEL[k]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={() => mut.mutate()} disabled={!data || mut.isPending}>
            {mut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

