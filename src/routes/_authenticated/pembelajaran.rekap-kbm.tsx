import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { listLaporanKbm, listLaporanKbmOptions, deleteLaporanKbm, signKbmMedia, getAttendanceDetailForKbm } from "@/lib/lapor-kbm.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect } from "react";
import { todayStamp } from "@/lib/utils";
import {
  ClipboardList, Trash2, Download, Printer, RefreshCw, BookOpen, CheckCircle2, AlertCircle, XCircle, Eye,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

export const listQO = queryOptions({
  queryKey: ["lapor-kbm-list"],
  queryFn: () => listLaporanKbm({ data: { limit: 500 } }),
});
export const optsQO = queryOptions({
  queryKey: ["lapor-kbm-options"],
  queryFn: () => listLaporanKbmOptions(),
});

export const Route = createFileRoute("/_authenticated/pembelajaran/rekap-kbm")({
  head: () => ({ meta: [{ title: "Rekap KBM — SUPREME EXPOES" }] }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(listQO), context.queryClient.ensureQueryData(optsQO)]),
  component: RekapKbmPage,
  errorComponent: ({ error }) => <div className="text-destructive p-6">Gagal memuat: {error.message}</div>,
});

type JamStatus = "M" | "T+" | "T-";

function aggregateStatus(row: any): JamStatus {
  const jamList: number[] = row.jam_list ?? [];
  const js: Record<string, JamStatus> = row.jam_status ?? {};
  if (!jamList.length) return "M";
  const vals = jamList.map((j) => (js[String(j)] as JamStatus) ?? "M");
  if (vals.some((v) => v === "T-")) return "T-";
  if (vals.some((v) => v === "T+")) return "T+";
  return "M";
}

function statusBadge(s: JamStatus) {
  if (s === "M") return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-xs font-medium">Masuk</span>;
  if (s === "T+") return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-medium">Tidak Masuk Dengan Tugas</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-xs font-medium">Tidak Masuk Tanpa Tugas</span>;
}

function jamBadges(row: any) {
  const jamList: number[] = row.jam_list ?? [];
  const js: Record<string, JamStatus> = row.jam_status ?? {};
  return (
    <div className="flex flex-wrap gap-1">
      {jamList.map((j) => {
        const s = (js[String(j)] as JamStatus) ?? "M";
        const cls =
          s === "M" ? "bg-emerald-500 text-white" : s === "T+" ? "bg-amber-500 text-white" : "bg-red-500 text-white";
        return (
          <span key={j} className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${cls}`}>
            {j}
          </span>
        );
      })}
    </div>
  );
}

function RekapKbmPage() {
  const { data: rows } = useSuspenseQuery(listQO);
  const { data: opts } = useSuspenseQuery(optsQO);
  const qc = useQueryClient();
  const del = useServerFn(deleteLaporanKbm);

  // Filter Statistik (top)
  const [statFrom, setStatFrom] = useState("");
  const [statTo, setStatTo] = useState("");
  const [semester, setSemester] = useState("all");

  // Filter Detail
  const [q, setQ] = useState("");
  const [rombelId, setRombelId] = useState("all");
  const [guruId, setGuruId] = useState("all");
  const [mapelId, setMapelId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [detail, setDetail] = useState<any | null>(null);

  const statRows = useMemo(() => {
    return (rows as any[]).filter((r) => {
      if (statFrom && r.tanggal < statFrom) return false;
      if (statTo && r.tanggal > statTo) return false;
      return true;
    });
  }, [rows, statFrom, statTo]);

  const stats = useMemo(() => {
    let total = 0, masuk = 0, tPlus = 0, tMinus = 0;
    for (const r of statRows) {
      const jl: number[] = r.jam_list ?? [];
      const js: Record<string, JamStatus> = r.jam_status ?? {};
      for (const j of jl) {
        total++;
        const s = (js[String(j)] as JamStatus) ?? "M";
        if (s === "M") masuk++;
        else if (s === "T+") tPlus++;
        else tMinus++;
      }
    }
    return { total, masuk, tPlus, tMinus };
  }, [statRows]);

  const pieData = [
    { name: "Masuk", value: stats.masuk, color: "hsl(142 71% 45%)" },
    { name: "Tidak Masuk Dengan Tugas", value: stats.tPlus, color: "hsl(38 92% 50%)" },
    { name: "Tidak Masuk Tanpa Tugas", value: stats.tMinus, color: "hsl(0 84% 60%)" },
  ];

  const topGuru = useMemo(() => {
    const map = new Map<string, { name: string; masuk: number }>();
    for (const r of statRows) {
      const jl: number[] = r.jam_list ?? [];
      const js: Record<string, JamStatus> = r.jam_status ?? {};
      const mCount = jl.reduce((a, j) => a + (((js[String(j)] as JamStatus) ?? "M") === "M" ? 1 : 0), 0);
      const key = r.guru_id ?? "-";
      const cur = map.get(key) ?? { name: r.guru_name ?? "—", masuk: 0 };
      cur.masuk += mCount;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.masuk - a.masuk).slice(0, 10);
  }, [statRows]);

  const perMapel = useMemo(() => {
    const map = new Map<string, { name: string; Masuk: number; "Tidak Masuk Dengan Tugas": number; "Tidak Masuk Tanpa Tugas": number }>();
    for (const r of statRows) {
      const jl: number[] = r.jam_list ?? [];
      const js: Record<string, JamStatus> = r.jam_status ?? {};
      const key = r.mata_pelajaran_id ?? "-";
      const cur = map.get(key) ?? { name: r.mapel_name ?? "—", Masuk: 0, "Tidak Masuk Dengan Tugas": 0, "Tidak Masuk Tanpa Tugas": 0 };
      for (const j of jl) {
        const s = (js[String(j)] as JamStatus) ?? "M";
        if (s === "M") cur.Masuk++;
        else if (s === "T+") cur["Tidak Masuk Dengan Tugas"]++;
        else cur["Tidak Masuk Tanpa Tugas"]++;
      }
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.Masuk - a.Masuk).slice(0, 14);
  }, [statRows]);

  const guruTanpaTugas = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const r of statRows) {
      const jl: number[] = r.jam_list ?? [];
      const js: Record<string, JamStatus> = r.jam_status ?? {};
      const cnt = jl.reduce((a, j) => a + (((js[String(j)] as JamStatus) ?? "M") === "T-" ? 1 : 0), 0);
      if (cnt > 0 && r.guru_id) {
        const cur = map.get(r.guru_id) ?? { id: r.guru_id, name: r.guru_name ?? "—", count: 0 };
        cur.count += cnt;
        map.set(r.guru_id, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [statRows]);

  const rombelBelum = useMemo(() => {
    const usedToday = new Set(
      statRows
        .filter((r) => !statTo || r.tanggal <= statTo)
        .filter((r) => !statFrom || r.tanggal >= statFrom)
        .map((r) => r.rombel_id),
    );
    return (opts.rombel as any[]).filter((r) => !usedToday.has(r.id));
  }, [opts.rombel, statRows, statFrom, statTo]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows as any[]).filter((r) => {
      if (rombelId !== "all" && r.rombel_id !== rombelId) return false;
      if (guruId !== "all" && r.guru_id !== guruId) return false;
      if (mapelId !== "all" && r.mata_pelajaran_id !== mapelId) return false;
      if (from && r.tanggal < from) return false;
      if (to && r.tanggal > to) return false;
      if (statusFilter !== "all" && aggregateStatus(r) !== statusFilter) return false;
      if (s) {
        const hay = [r.tanggal, r.rombel_name, r.mapel_name, r.guru_name, r.materi, r.capaian_pembelajaran, r.catatan]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    }).slice(0, pageSize);
  }, [rows, q, rombelId, guruId, mapelId, from, to, statusFilter, pageSize]);

  const removeMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Laporan dihapus");
      qc.invalidateQueries({ queryKey: ["lapor-kbm-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportCsv = () => {
    const header = ["Tanggal", "Rombel", "Guru", "Mapel", "Jam", "Status"];
    const lines = [header.join(",")];
    for (const r of filtered as any[]) {
      const cells = [r.tanggal, r.rombel_name, r.guru_name, r.mapel_name, (r.jam_list ?? []).join("|"), aggregateStatus(r)]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`);
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `rekap-kbm-${todayStamp()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const resetStatFilter = () => { setStatFrom(""); setStatTo(""); setSemester("all"); };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Rekap KBM
          </h1>
          <p className="text-sm text-muted-foreground">Dashboard analitik pelaksanaan kegiatan belajar mengajar.</p>
        </div>
      </div>

      {/* Filter Statistik */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter Statistik</CardTitle>
          <p className="text-xs text-muted-foreground">Filter data untuk seluruh statistik di bawah.</p>
        </CardHeader>
        <CardContent className="grid gap-3 grid-cols-1 md:grid-cols-4">
          <div>
            <label className="text-xs text-muted-foreground">Tanggal Awal</label>
            <Input type="date" value={statFrom} onChange={(e) => setStatFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tanggal Akhir</label>
            <Input type="date" value={statTo} onChange={(e) => setStatTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Semester</label>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semester Aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={resetStatFilter}>
              <RefreshCw className="h-4 w-4 mr-1" /> Reset Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="laporan">
        <TabsList>
          <TabsTrigger value="laporan">Laporan & Statistik</TabsTrigger>
          <TabsTrigger value="catatan">Catatan Mengajar</TabsTrigger>
        </TabsList>

        <TabsContent value="laporan" className="space-y-6 mt-4">
          {/* Stat cards */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
            <StatCard label="Total Jam" value={stats.total} icon={<BookOpen className="h-5 w-5" />} color="text-blue-600" />
            <StatCard label="Masuk" value={stats.masuk} icon={<CheckCircle2 className="h-5 w-5" />} color="text-emerald-600" />
            <StatCard label="Tidak Masuk (Dengan Tugas)" value={stats.tPlus} icon={<AlertCircle className="h-5 w-5" />} color="text-amber-600" />
            <StatCard label="Tidak Masuk Tanpa Tugas" value={stats.tMinus} icon={<XCircle className="h-5 w-5" />} color="text-red-600" />
          </div>

          {/* Charts */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Distribusi Status KBM</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={90} label>
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Top 10 Guru berdasarkan Kehadiran</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topGuru} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="masuk" fill="hsl(142 71% 45%)" name="Jam Masuk" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Statistik per Mata Pelajaran</CardTitle></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perMapel}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={70} interval={0} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Masuk" fill="hsl(142 71% 45%)" />
                  <Bar dataKey="Tidak Masuk Dengan Tugas" fill="hsl(38 92% 50%)" />
                  <Bar dataKey="Tidak Masuk Tanpa Tugas" fill="hsl(0 84% 60%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Rombel belum menginput */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Peringatan: Rombel Belum Menginput Laporan
              </CardTitle>
              <p className="text-xs text-muted-foreground">Daftar rombel yang belum mencatat laporan pada rentang tanggal terpilih.</p>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Rombel</TableHead>
                    <TableHead className="text-right">Jumlah Kosong</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rombelBelum.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Semua rombel sudah menginput.</TableCell></TableRow>
                  )}
                  {rombelBelum.slice(0, 15).map((r: any, i: number) => (
                    <TableRow key={r.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">Kosong</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Guru tanpa tugas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Guru Tidak Masuk Tanpa Tugas</CardTitle>
              <p className="text-xs text-muted-foreground">Daftar guru yang tidak masuk tanpa memberikan tugas.</p>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Nama Guru</TableHead>
                    <TableHead className="text-right">Jumlah Jam</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guruTanpaTugas.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Tidak ada data.</TableCell></TableRow>
                  )}
                  {guruTanpaTugas.slice(0, 10).map((g, i) => (
                    <TableRow key={g.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">{g.count} Jam</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Detail */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Rekap Detail KBM</CardTitle>
              <p className="text-xs text-muted-foreground">Riwayat pelaksanaan KBM yang sudah dilaporkan.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
                <div>
                  <label className="text-xs text-muted-foreground">Tanggal Awal</label>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Tanggal Akhir</label>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="M">Masuk</SelectItem>
                      <SelectItem value="T+">Tidak Masuk Dengan Tugas</SelectItem>
                      <SelectItem value="T-">Tidak Masuk Tanpa Tugas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Rombel</label>
                  <Select value={rombelId} onValueChange={setRombelId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Rombel</SelectItem>
                      {opts.rombel.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Guru</label>
                  <Select value={guruId} onValueChange={setGuruId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Guru</SelectItem>
                      {opts.guru.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Mata Pelajaran</label>
                  <Select value={mapelId} onValueChange={setMapelId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Mapel</SelectItem>
                      {opts.mapel.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nama}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Input placeholder="Cari materi, guru, catatan..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
                <div className="ml-auto flex items-center gap-2">
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[25, 50, 100, 200].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["lapor-kbm-list"] })}>
                    <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                  </Button>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="h-4 w-4 mr-1" /> Cetak
                  </Button>
                  <Button variant="outline" onClick={exportCsv}>
                    <Download className="h-4 w-4 mr-1" /> Export CSV
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Rombel</TableHead>
                      <TableHead>Guru TL</TableHead>
                      <TableHead>Mata Pelajaran</TableHead>
                      <TableHead>Jam</TableHead>
                      <TableHead>Status TL</TableHead>
                      <TableHead>Pelapor</TableHead>
                      <TableHead className="w-16 text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Belum ada laporan</TableCell></TableRow>
                    )}
                    {filtered.map((r: any, i: number) => (
                      <TableRow key={r.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.tanggal}</TableCell>
                        <TableCell>{r.rombel_name}</TableCell>
                        <TableCell className="font-medium">{r.guru_name}</TableCell>
                        <TableCell>{r.mapel_name}</TableCell>
                        <TableCell>{jamBadges(r)}</TableCell>
                        <TableCell>{statusBadge(aggregateStatus(r))}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.guru_name}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button size="icon" variant="ghost" title="Lihat" onClick={() => setDetail(r)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Hapus"
                              onClick={() => { if (confirm("Hapus laporan ini?")) removeMut.mutate(r.id); }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catatan" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Catatan Mengajar</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(statRows as any[]).filter((r) => r.materi || r.catatan || r.capaian_pembelajaran).slice(0, 50).map((r: any) => (
                  <div key={r.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{r.tanggal} • {r.rombel_name} • {r.mapel_name}</span>
                      <span>{r.guru_name}</span>
                    </div>
                    {r.materi && <div className="text-sm"><span className="font-medium">Materi:</span> {r.materi}</div>}
                    {r.capaian_pembelajaran && <div className="text-sm"><span className="font-medium">Capaian:</span> {r.capaian_pembelajaran}</div>}
                    {r.catatan && <div className="text-sm"><span className="font-medium">Catatan:</span> {r.catatan}</div>}
                  </div>
                ))}
                {(statRows as any[]).filter((r) => r.materi || r.catatan || r.capaian_pembelajaran).length === 0 && (
                  <div className="text-center text-muted-foreground py-8">Belum ada catatan mengajar.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DetailDialog row={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function MediaPreview({ path, label }: { path: string; label: string }) {
  const sign = useServerFn(signKbmMedia);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    setUrl(null);
    setErr(false);
    sign({ data: { path } })
      .then((r: any) => { if (alive) setUrl(r.url); })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, [path]);

  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      {err ? (
        <div className="text-xs text-destructive">Gagal memuat berkas.</div>
      ) : url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={label} className="max-h-56 rounded-lg border object-contain bg-muted/30" />
        </a>
      ) : (
        <div className="h-24 rounded-lg border bg-muted/30 animate-pulse" />
      )}
    </div>
  );
}

function DetailDialog({ row, onClose }: { row: any | null; onClose: () => void }) {
  const fetchAtt = useServerFn(getAttendanceDetailForKbm);
  const [att, setAtt] = useState<{ has_record: boolean; students: any[]; summary: any; officer_name: string | null } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!row) {
      setAtt(null);
      return;
    }
    setLoading(true);
    fetchAtt({ data: { rombel_id: row.rombel_id, tanggal: row.tanggal } })
      .then((r) => setAtt(r as any))
      .finally(() => setLoading(false));
  }, [row?.id, row?.rombel_id, row?.tanggal]);

  return (
    <Dialog open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Laporan KBM</DialogTitle>
        </DialogHeader>
        {row && (
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tanggal" value={row.tanggal} />
              <Field label="Rombel" value={row.rombel_name} />
              <Field label="Guru" value={row.guru_name} />
              <Field label="Mata Pelajaran" value={row.mapel_name} />
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Jam Pelajaran</div>
              {jamBadges(row)}
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Status Guru</div>
              {statusBadge(aggregateStatus(row))}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { l: "Hadir", v: row.jumlah_hadir },
                { l: "Izin", v: row.jumlah_izin },
                { l: "Sakit", v: row.jumlah_sakit },
                { l: "Alpa", v: row.jumlah_alpa },
              ].map((x) => (
                <div key={x.l} className="rounded-lg border p-2 text-center">
                  <div className="text-xs text-muted-foreground">{x.l}</div>
                  <div className="text-lg font-bold">{x.v ?? 0}</div>
                </div>
              ))}
            </div>

            {/* Detail Kehadiran Murid */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="font-semibold text-sm">Detail Kehadiran Murid</div>
                {att?.officer_name && (
                  <div className="text-xs text-muted-foreground">Petugas piket: {att.officer_name}</div>
                )}
              </div>

              {loading ? (
                <div className="h-24 rounded-lg bg-muted/30 animate-pulse" />
              ) : att ? (
                att.has_record ? (
                  <>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-1">Hadir: {att.summary.H}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-700 px-2 py-1">Izin: {att.summary.I}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-1">Sakit: {att.summary.S}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 px-2 py-1">Alfa: {att.summary.A}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 px-2 py-1">PKL: {att.summary.P}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-2 py-1">Total: {att.summary.total}</span>
                    </div>

                    {att.students.length === 0 ? (
                      <div className="text-center text-muted-foreground py-6">Tidak ada data murid di rombel ini.</div>
                    ) : (
                      <div className="overflow-x-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">No</TableHead>
                              <TableHead>NIS</TableHead>
                              <TableHead>Nama Murid</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {att.students.map((s: any, i: number) => (
                              <TableRow key={s.id}>
                                <TableCell>{i + 1}</TableCell>
                                <TableCell className="whitespace-nowrap">{s.nis || "—"}</TableCell>
                                <TableCell className="font-medium">{s.name}</TableCell>
                                <TableCell className="text-center">{attendanceStatusBadge(s.status)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-6">
                    Belum ada data presensi harian untuk rombel dan tanggal ini.
                  </div>
                )
              ) : null}
            </div>

            <Field label="Materi" value={row.materi} block />
            <Field label="Capaian Pembelajaran" value={row.capaian_pembelajaran} block />
            <Field label="Catatan" value={row.catatan} block />

            <div className="grid gap-3 sm:grid-cols-2">
              {row.foto_path && <MediaPreview path={row.foto_path} label="Foto Kegiatan" />}
              {row.ttd_path && <MediaPreview path={row.ttd_path} label="Tanda Tangan" />}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function attendanceStatusBadge(status: "H" | "S" | "I" | "A" | "P") {
  const map: Record<string, { label: string; className: string }> = {
    H: { label: "Hadir", className: "bg-emerald-100 text-emerald-700" },
    S: { label: "Sakit", className: "bg-amber-100 text-amber-700" },
    I: { label: "Izin", className: "bg-sky-100 text-sky-700" },
    A: { label: "Alfa", className: "bg-rose-100 text-rose-700" },
    P: { label: "PKL", className: "bg-violet-100 text-violet-700" },
  };
  const m = map[status] ?? { label: status, className: "bg-slate-100 text-slate-700" };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.className}`}>{m.label}</span>;
}

function Field({ label, value, block }: { label: string; value?: string | null; block?: boolean }) {
  return (
    <div className={block ? "" : undefined}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium whitespace-pre-wrap">{value || "—"}</div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-3xl font-bold mt-1">{value.toLocaleString("id-ID")}</div>
        </div>
        <div className={`${color} opacity-80`}>{icon}</div>
      </CardContent>
    </Card>
  );
}
