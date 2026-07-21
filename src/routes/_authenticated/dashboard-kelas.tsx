import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CalendarDays, CheckCircle2, XCircle, Heart, FileText, Clock,
  Users, GraduationCap, AlertTriangle, Search, Download, Eye, BookOpen,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { listRombelForDashboardKelas, getDashboardKelas } from "@/lib/dashboard-kelas.functions";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard-kelas")({
  head: () => ({ meta: [{ title: "Dashboard Kelas — SUPREME XPOES" }] }),
  component: Page,
});

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function Page() {
  const listFn = useServerFn(listRombelForDashboardKelas);
  const { data: rombelList } = useQuery({
    queryKey: ["dashboard-kelas-rombels"],
    queryFn: () => listFn(),
  });

  const [rombelId, setRombelId] = useState<string>("");
  const [date, setDate] = useState<string>(todayISO());
  // Kehadiran recap range (null = default: current month of `date`)
  const [kehadiranRange, setKehadiranRange] = useState<{ startDate: string; endDate: string; label: string } | null>(null);
  // Trend chart range (null = default: current week)
  const [trendRange, setTrendRange] = useState<{ start: string; end: string; label: string } | null>(null);

  const detailFn = useServerFn(getDashboardKelas);
  const monthYear = useMemo(() => {
    const d = new Date(date + "T00:00:00");
    return { bulan: d.getMonth() + 1, tahun: d.getFullYear() };
  }, [date]);
  const { data, isLoading, error } = useQuery({
    enabled: !!rombelId,
    queryKey: ["dashboard-kelas", rombelId, date, monthYear.bulan, monthYear.tahun, kehadiranRange?.startDate, kehadiranRange?.endDate, trendRange?.start, trendRange?.end],
    queryFn: () => detailFn({
      data: {
        rombelId, date, bulan: monthYear.bulan, tahun: monthYear.tahun,
        startDate: kehadiranRange?.startDate, endDate: kehadiranRange?.endDate,
        trendStart: trendRange?.start, trendEnd: trendRange?.end,
      },
    }),
  });


  const tanggalLabel = useMemo(() => {
    const d = new Date(date + "T00:00:00");
    return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, [date]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {data?.rombel ? `Dashboard Kelas: ${data.rombel.name}` : "Dashboard Kelas"}
          </h1>
          {data?.rombel ? (
            <p className="text-sm text-muted-foreground mt-1">
              Wali Kelas: {data.rombel.wali_kelas_name ?? "—"} · {data.totalSiswa} Murid (L: {data.totalL}, P: {data.totalP})
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">Pilih kelas untuk menampilkan dashboard</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:flex-wrap">
          <Select value={rombelId} onValueChange={setRombelId}>
            <SelectTrigger className="w-full sm:w-56 h-10">
              <SelectValue placeholder="Pilih Kelas" />
            </SelectTrigger>
            <SelectContent>
              {(rombelList ?? []).length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">Tidak ada rombel yang bisa diakses</div>
              )}
              {(rombelList ?? []).map((r: any) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-full sm:w-auto">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-9 h-10 w-full sm:w-52"
            />
          </div>
        </div>

      </div>

      {!rombelId ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <GraduationCap className="h-10 w-10 text-muted-foreground" />
            <div className="font-semibold">Pilih Kelas</div>
            <p className="text-sm text-muted-foreground">Silakan pilih kelas untuk melihat dashboard.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="text-sm text-muted-foreground">Memuat…</div>
      ) : error ? (
        <div className="text-sm text-destructive">{(error as Error).message}</div>
      ) : data ? (
        <Tabs defaultValue="ringkasan" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
            <TabsTrigger value="daftar">Daftar Murid</TabsTrigger>
            <TabsTrigger value="kehadiran">Kehadiran</TabsTrigger>
            <TabsTrigger value="keterlambatan">Keterlambatan</TabsTrigger>
            <TabsTrigger value="jadwal">Jadwal</TabsTrigger>
            <TabsTrigger value="sp">Status SP</TabsTrigger>
          </TabsList>

          <TabsContent value="ringkasan" className="space-y-4">
            <RingkasanTab data={data} tanggalLabel={tanggalLabel} trendRange={trendRange} setTrendRange={setTrendRange} />
          </TabsContent>


          <TabsContent value="daftar">
            <DaftarSiswaTab data={data} />
          </TabsContent>

          <TabsContent value="kehadiran">
            <KehadiranTab data={data} range={kehadiranRange} setRange={setKehadiranRange} />
          </TabsContent>

          <TabsContent value="keterlambatan">
            <KeterlambatanTab data={data} bulan={monthYear.bulan} tahun={monthYear.tahun} />
          </TabsContent>

          <TabsContent value="jadwal">
            <JadwalTab data={data} />
          </TabsContent>

          <TabsContent value="sp">
            <StatusSpTab data={data} />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}

/* ------------------ Ringkasan ------------------ */
function RingkasanTab({ data, tanggalLabel, trendRange, setTrendRange }: { data: any; tanggalLabel: string; trendRange: { start: string; end: string; label: string } | null; setTrendRange: (r: { start: string; end: string; label: string } | null) => void }) {
  const s = data.todaySummary;
  const total = data.totalSiswa || 1;
  const pct = (n: number) => Math.round((n / total) * 100);
  const cards = [
    { label: "Hadir", value: s.H, sub: `${pct(s.H)}%`, tone: "green", icon: <CheckCircle2 className="h-4 w-4" /> },
    { label: "Sakit", value: s.S, sub: `${pct(s.S)}%`, tone: "blue", icon: <Heart className="h-4 w-4" /> },
    { label: "Izin", value: s.I, sub: `${pct(s.I)}%`, tone: "amber", icon: <FileText className="h-4 w-4" /> },
    { label: "Alfa", value: s.A, sub: `${pct(s.A)}%`, tone: "red", icon: <XCircle className="h-4 w-4" /> },
    { label: "Terlambat", value: s.terlambat, sub: "siswa", tone: "orange", icon: <Clock className="h-4 w-4" /> },
  ];
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c) => <SummaryCard key={c.label} {...c} />)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SpMini level={1} value={data.sp.sp1} />
        <SpMini level={2} value={data.sp.sp2} />
        <SpMini level={3} value={data.sp.sp3} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Kehadiran Murid Hari Ini
          </CardTitle>
          <p className="text-xs text-muted-foreground">{tanggalLabel}</p>
        </CardHeader>
        <CardContent>
          {data.todaySummary.H + data.todaySummary.S + data.todaySummary.I + data.todaySummary.A + data.todaySummary.P === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">Belum ada data presensi untuk hari ini.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {["H","S","I","A","P"].map((k) => (
                <div key={k} className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{fullStatus(k)}</div>
                  <div className="text-xl font-bold mt-1">{(data.todaySummary as any)[k]}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" /> Jadwal Pelajaran Hari {capitalize(data.periode.hariNama)}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{tanggalLabel}</p>
        </CardHeader>
        <CardContent className="p-0">
          {data.jadwalHariIni.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">Tidak ada jadwal untuk hari ini.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Jam</TableHead>
                    <TableHead className="w-40">Waktu</TableHead>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Guru</TableHead>
                    <TableHead className="w-32">Status KBM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.jadwalHariIni.map((j: any) => (
                    <TableRow key={j.id}>
                      <TableCell>{j.jam_ke ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {(j.jam_mulai ?? "—")} – {(j.jam_selesai ?? "—")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{j.mapel}</TableCell>
                      <TableCell className="whitespace-nowrap">{j.guru}</TableCell>
                      <TableCell><KbmBadge status={j.kbm_status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Tren Kehadiran</CardTitle>
          <TrendRangePicker
            label={trendRange?.label ?? "Minggu Ini"}
            range={trendRange}
            setRange={setTrendRange}
            currentDate={data.periode.tanggal}
            semester={data.semester}
          />
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.trend ?? data.weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="H" name="Hadir" stroke="#10b981" />
              <Line type="monotone" dataKey="S" name="Sakit" stroke="#3b82f6" />
              <Line type="monotone" dataKey="I" name="Izin" stroke="#f59e0b" />
              <Line type="monotone" dataKey="A" name="Alfa" stroke="#ef4444" />
              <Line type="monotone" dataKey="P" name="PKL" stroke="#8b5cf6" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

    </>
  );
}

/* ------------------ Daftar Murid ------------------ */
function DaftarSiswaTab({ data }: { data: any }) {
  const [q, setQ] = useState("");
  const [gender, setGender] = useState("all");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.students.filter((r: any) => {
      if (gender !== "all") {
        const g = String(r.gender ?? "").toUpperCase();
        if (gender === "L" && !g.startsWith("L")) return false;
        if (gender === "P" && !g.startsWith("P")) return false;
      }
      if (!s) return true;
      return `${r.name ?? ""} ${r.nis ?? ""}`.toLowerCase().includes(s);
    });
  }, [data.students, q, gender]);

  const exportCsv = () => {
    const rows = [["No", "NIS", "Nama", "L/P"], ...filtered.map((s: any, i: number) => [i + 1, s.nis ?? "", s.name ?? "", s.gender ?? ""])];
    const csv = rows.map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daftar-murid-${data.rombel.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-2">
        <CardTitle className="text-base">Daftar Murid</CardTitle>
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <div className="relative flex-1 min-w-[10rem] md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama/NIS…" className="pl-9 h-9 w-full md:w-56" />
          </div>

          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="L">Laki-laki</SelectItem>
              <SelectItem value="P">Perempuan</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="h-9 px-3 rounded-md">{filtered.length}</Badge>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead className="w-28">NIS</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="w-16">L/P</TableHead>
                <TableHead className="w-20 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">Tidak ada murid.</TableCell></TableRow>
              ) : filtered.map((s: any, i: number) => (
                <TableRow key={s.id}>
                  <TableCell className="text-primary font-medium">{i + 1}</TableCell>
                  <TableCell className="whitespace-nowrap">{s.nis ?? "—"}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{s.name ?? "—"}</TableCell>
                  <TableCell>{s.gender ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                      <Link to="/dashboard-murid/$studentId" params={{ studentId: s.id }}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

    </Card>
  );
}

/* ------------------ Kehadiran ------------------ */
function KehadiranTab({
  data,
  range,
  setRange,
}: {
  data: any;
  range: { startDate: string; endDate: string; label: string } | null;
  setRange: (r: { startDate: string; endDate: string; label: string } | null) => void;
}) {
  const dist = data.distribusi;
  const pieData = [
    { name: "Hadir", value: dist.H, color: "#10b981" },
    { name: "Sakit", value: dist.S, color: "#3b82f6" },
    { name: "Izin", value: dist.I, color: "#f59e0b" },
    { name: "Alfa", value: dist.A, color: "#ef4444" },
    { name: "PKL", value: dist.P, color: "#8b5cf6" },
  ].filter((d) => d.value > 0);
  const defaultLabel = `${BULAN[data.periode.bulan - 1]} ${data.periode.tahun}`;
  const label = range?.label ?? defaultLabel;
  const semester = data.semester as
    | { nama: string | null; tanggal_mulai: string | null; tanggal_selesai: string | null; tahun_ajaran: { nama: string | null } | null }
    | null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Rekap Kehadiran</CardTitle>
          <RangePicker
            label={label}
            range={range}
            setRange={setRange}
            defaultBulan={data.periode.bulan}
            defaultTahun={data.periode.tahun}
            semester={semester}
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-auto">

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead className="w-10 text-center">H</TableHead>
                  <TableHead className="w-10 text-center">S</TableHead>
                  <TableHead className="w-10 text-center">I</TableHead>
                  <TableHead className="w-10 text-center">A</TableHead>
                  <TableHead className="w-10 text-center">P</TableHead>
                  <TableHead className="w-40">Persentase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rekapKehadiran.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-6 text-sm text-muted-foreground">Belum ada data.</TableCell></TableRow>
                ) : data.rekapKehadiran.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.nis ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-center">{r.H}</TableCell>
                    <TableCell className="text-center">{r.S}</TableCell>
                    <TableCell className="text-center">{r.I}</TableCell>
                    <TableCell className="text-center">{r.A}</TableCell>
                    <TableCell className="text-center text-primary font-medium">{r.P}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={r.persen} className="h-1.5 flex-1" />
                        <span className="text-xs w-10 text-right">{r.persen}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Distribusi Kehadiran</CardTitle></CardHeader>
        <CardContent className="h-72">
          {pieData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Tidak ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------ Keterlambatan ------------------ */
function KeterlambatanTab({ data, bulan, tahun }: { data: any; bulan: number; tahun: number }) {
  const list = data.keterlambatan.bulanIni ?? [];
  // aggregate per student
  const agg = new Map<string, { id: string; name: string; nis: string; count: number; last: string | null }>();
  list.forEach((r: any) => {
    const prev = agg.get(r.student_id);
    if (prev) {
      prev.count++;
      if (!prev.last || (r.record_date && r.record_date > prev.last)) prev.last = r.record_date;
    } else {
      agg.set(r.student_id, { id: r.student_id, name: r.name, nis: r.nis, count: 1, last: r.record_date });
    }
  });
  const sorted = Array.from(agg.values()).sort((a, b) => b.count - a.count);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 grid grid-cols-1 gap-3">
        <StatBig label="Total Terlambat (semua waktu)" value={data.keterlambatan.total} tone="orange" icon={<Clock className="h-5 w-5" />} />
        <StatBig label={`Bulan ${BULAN[bulan - 1]} ${tahun}`} value={list.length} tone="amber" icon={<CalendarDays className="h-5 w-5" />} />
        <StatBig label="Murid Terlambat (bulan ini)" value={sorted.length} tone="red" icon={<Users className="h-5 w-5" />} />
      </div>
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-base">Rekap Keterlambatan Bulan Ini</CardTitle></CardHeader>
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Tidak ada keterlambatan bulan ini.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead className="w-28">NIS</TableHead>
                  <TableHead className="w-24 text-center">Jumlah</TableHead>
                  <TableHead className="w-40">Terakhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.nis}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{r.count}×</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.last ? new Date(r.last).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------ Jadwal ------------------ */
function JadwalTab({ data }: { data: any }) {
  const grouped = new Map<string, any[]>();
  ["senin","selasa","rabu","kamis","jumat","sabtu"].forEach((h) => grouped.set(h, []));
  (data.jadwalMingguan as any[]).forEach((j) => {
    if (grouped.has(j.hari)) grouped.get(j.hari)!.push(j);
  });
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Jadwal Pelajaran Mingguan</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {Array.from(grouped.entries()).map(([hari, rows]) => (
          <div key={hari} className="rounded-lg border p-3">
            <div className="font-semibold mb-2">{capitalize(hari)}</div>
            {rows.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">Tidak ada jadwal.</div>
            ) : (
              <div className="divide-y">
                {rows.map((j: any) => (
                  <div key={j.id} className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 py-2 text-sm">
                    <div className="w-14 shrink-0"><span className="text-xs text-muted-foreground">Jam</span> <span className="font-medium">{j.jam_ke ?? "—"}</span></div>
                    <div className="w-40 shrink-0 text-xs text-muted-foreground">{(j.jam_mulai ?? "—")} – {(j.jam_selesai ?? "—")}</div>
                    <div className="flex-1 font-medium">{j.mapel}</div>
                    <div className="text-xs text-muted-foreground md:text-right md:w-56 truncate">{j.guru}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ------------------ SP ------------------ */
function StatusSpTab({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SpMini level={1} value={data.sp.sp1} />
        <SpMini level={2} value={data.sp.sp2} />
        <SpMini level={3} value={data.sp.sp3} />
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Murid dengan SP Aktif</CardTitle></CardHeader>
        <CardContent className="p-0">
          {data.sp.list.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Tidak ada murid dengan SP aktif.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="w-28">NIS</TableHead>
                  <TableHead className="w-24">Level SP</TableHead>
                  <TableHead>Alasan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sp.list.map((r: any, i: number) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-primary font-medium">{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.nis}</TableCell>
                    <TableCell><SpBadge level={r.level} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[280px]">{r.alasan ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="p-3 border-t">
            <Button asChild variant="outline" size="sm">
              <Link to="/sp">Kelola SP di BPBK</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------ Small pieces ------------------ */
function SummaryCard({ label, value, sub, tone, icon }: { label: string; value: number; sub: string; tone: string; icon: React.ReactNode }) {
  const map: Record<string, string> = {
    green: "text-emerald-600",
    red: "text-red-600",
    amber: "text-amber-600",
    blue: "text-blue-600",
    orange: "text-orange-600",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={map[tone]}>{icon}</div>
        </div>
        <div className="text-2xl font-bold mt-2">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{sub}</div>
      </CardContent>
    </Card>
  );
}

function SpMini({ level, value }: { level: number; value: number }) {
  const map: Record<number, string> = {
    1: "border-l-amber-400",
    2: "border-l-orange-500",
    3: "border-l-red-500",
  };
  return (
    <Card className={`border-l-4 ${map[level]}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4" /> SP {level} Aktif
        </div>
        <div className="text-2xl font-bold mt-2">{value}</div>
      </CardContent>
    </Card>
  );
}

function StatBig({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: React.ReactNode }) {
  const map: Record<string, string> = {
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <div className={`rounded-lg border p-4 ${map[tone]}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs">{label}</div>
        {icon}
      </div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}

function KbmBadge({ status }: { status: string }) {
  const s = String(status).toLowerCase();
  if (s === "sudah" || s === "selesai") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Sudah</Badge>;
  if (s === "kosong" || s === "kosong_pkl") return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Kosong</Badge>;
  return <Badge variant="secondary">Belum</Badge>;
}

function SpBadge({ level }: { level: number }) {
  if (level >= 3) return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">SP 3</Badge>;
  if (level === 2) return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">SP 2</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">SP 1</Badge>;
}

function fullStatus(k: string) {
  return { H: "Hadir", S: "Sakit", I: "Izin", A: "Alfa", P: "PKL" }[k] ?? k;
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/* ------------------ Range Picker (Kehadiran) ------------------ */
function RangePicker({
  label,
  range,
  setRange,
  defaultBulan,
  defaultTahun,
  semester,
}: {
  label: string;
  range: { startDate: string; endDate: string; label: string } | null;
  setRange: (r: { startDate: string; endDate: string; label: string } | null) => void;
  defaultBulan: number;
  defaultTahun: number;
  semester: { nama: string | null; tanggal_mulai: string | null; tanggal_selesai: string | null; tahun_ajaran: { nama: string | null } | null } | null;
}) {
  const [open, setOpen] = useState(false);
  const [bulan, setBulan] = useState<number>(defaultBulan);
  const [tahun, setTahun] = useState<number>(defaultTahun);
  const [customStart, setCustomStart] = useState<string>(range?.startDate ?? "");
  const [customEnd, setCustomEnd] = useState<string>(range?.endDate ?? "");

  // Month options limited to semester bounds if available
  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string; bulan: number; tahun: number }[] = [];
    if (semester?.tanggal_mulai && semester?.tanggal_selesai) {
      const s = new Date(semester.tanggal_mulai + "T00:00:00");
      const e = new Date(semester.tanggal_selesai + "T00:00:00");
      const cur = new Date(s.getFullYear(), s.getMonth(), 1);
      while (cur <= e) {
        const b = cur.getMonth() + 1;
        const y = cur.getFullYear();
        opts.push({ value: `${y}-${b}`, label: `${BULAN[b - 1]} ${y}`, bulan: b, tahun: y });
        cur.setMonth(cur.getMonth() + 1);
      }
    } else {
      // fallback: 12 months around current
      for (let i = -6; i <= 6; i++) {
        const d = new Date(defaultTahun, defaultBulan - 1 + i, 1);
        const b = d.getMonth() + 1;
        const y = d.getFullYear();
        opts.push({ value: `${y}-${b}`, label: `${BULAN[b - 1]} ${y}`, bulan: b, tahun: y });
      }
    }
    return opts;
  }, [semester, defaultBulan, defaultTahun]);

  const applyMonth = (b: number, y: number) => {
    const start = `${y}-${String(b).padStart(2, "0")}-01`;
    const last = new Date(y, b, 0).getDate();
    const end = `${y}-${String(b).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
    setBulan(b);
    setTahun(y);
    setRange({ startDate: start, endDate: end, label: `${BULAN[b - 1]} ${y}` });
    setOpen(false);
  };

  const applySemester = () => {
    if (!semester?.tanggal_mulai || !semester?.tanggal_selesai) return;
    const ta = semester.tahun_ajaran?.nama ? ` ${semester.tahun_ajaran.nama}` : "";
    setRange({
      startDate: semester.tanggal_mulai,
      endDate: semester.tanggal_selesai,
      label: `${semester.nama ?? "Semester"}${ta}`,
    });
    setOpen(false);
  };

  const applyCustom = () => {
    if (!customStart || !customEnd) return;
    const s = customStart <= customEnd ? customStart : customEnd;
    const e = customStart <= customEnd ? customEnd : customStart;
    setRange({ startDate: s, endDate: e, label: `${s} — ${e}` });
    setOpen(false);
  };

  const reset = () => {
    setRange(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div>
          <div className="text-xs font-semibold mb-1">Pilih Bulan</div>
          <div className="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto pr-1">
            {monthOptions.map((m) => (
              <Button
                key={m.value}
                size="sm"
                variant={range?.startDate === `${m.tahun}-${String(m.bulan).padStart(2, "0")}-01` ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => applyMonth(m.bulan, m.tahun)}
              >
                {BULAN[m.bulan - 1].slice(0, 3)} {String(m.tahun).slice(2)}
              </Button>
            ))}
          </div>
        </div>

        {semester?.tanggal_mulai && semester?.tanggal_selesai ? (
          <div>
            <div className="text-xs font-semibold mb-1">Rentang Semester</div>
            <Button size="sm" variant="secondary" className="w-full h-8 justify-start text-xs" onClick={applySemester}>
              {semester.nama ?? "Semester"}
              {semester.tahun_ajaran?.nama ? ` · ${semester.tahun_ajaran.nama}` : ""}
              <span className="ml-auto text-[10px] text-muted-foreground">
                {semester.tanggal_mulai} → {semester.tanggal_selesai}
              </span>
            </Button>
          </div>
        ) : null}

        <div>
          <div className="text-xs font-semibold mb-1">Rentang Kustom</div>
          <div className="flex items-center gap-2">
            <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-8 text-xs" />
            <span className="text-xs">—</span>
            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-8 text-xs" />
          </div>
          <Button size="sm" className="w-full h-8 mt-2" onClick={applyCustom} disabled={!customStart || !customEnd}>
            Terapkan Rentang
          </Button>
        </div>

        <div className="flex justify-between pt-1 border-t">
          <Button size="sm" variant="ghost" onClick={reset}>Reset</Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Tutup</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------ Trend Range Picker ------------------ */
function TrendRangePicker({
  label,
  range,
  setRange,
  currentDate,
  semester,
}: {
  label: string;
  range: { start: string; end: string; label: string } | null;
  setRange: (r: { start: string; end: string; label: string } | null) => void;
  currentDate: string;
  semester: { nama: string | null; tanggal_mulai: string | null; tanggal_selesai: string | null; tahun_ajaran: { nama: string | null } | null } | null;
}) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState<string>(range?.start ?? "");
  const [customEnd, setCustomEnd] = useState<string>(range?.end ?? "");

  const applyWeek = () => {
    const d = new Date(currentDate + "T00:00:00");
    const dw = d.getDay();
    const diffMon = dw === 0 ? -6 : 1 - dw;
    const ws = new Date(d); ws.setDate(d.getDate() + diffMon);
    const we = new Date(ws); we.setDate(ws.getDate() + 5);
    setRange({ start: ws.toISOString().slice(0, 10), end: we.toISOString().slice(0, 10), label: "Minggu Ini" });
    setOpen(false);
  };

  const applyMonth = () => {
    const d = new Date(currentDate + "T00:00:00");
    const y = d.getFullYear(); const m = d.getMonth();
    const s = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const last = new Date(y, m + 1, 0).getDate();
    const e = `${y}-${String(m + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
    setRange({ start: s, end: e, label: `${BULAN[m]} ${y}` });
    setOpen(false);
  };

  const applySemester = () => {
    if (!semester?.tanggal_mulai || !semester?.tanggal_selesai) return;
    const ta = semester.tahun_ajaran?.nama ? ` ${semester.tahun_ajaran.nama}` : "";
    setRange({
      start: semester.tanggal_mulai,
      end: semester.tanggal_selesai,
      label: `${semester.nama ?? "Semester"}${ta}`,
    });
    setOpen(false);
  };

  const applyCustom = () => {
    if (!customStart || !customEnd) return;
    const s = customStart <= customEnd ? customStart : customEnd;
    const e = customStart <= customEnd ? customEnd : customStart;
    setRange({ start: s, end: e, label: `${s} — ${e}` });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div>
          <div className="text-xs font-semibold mb-1">Preset</div>
          <div className="grid grid-cols-3 gap-1">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={applyWeek}>Minggu</Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={applyMonth}>Bulan</Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={applySemester}
              disabled={!semester?.tanggal_mulai || !semester?.tanggal_selesai}
            >
              Semester
            </Button>
          </div>
          {semester?.nama && (
            <div className="text-[10px] text-muted-foreground mt-1">
              Semester aktif: {semester.nama}
              {semester.tahun_ajaran?.nama ? ` · ${semester.tahun_ajaran.nama}` : ""}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-semibold mb-1">Rentang Kustom</div>
          <div className="flex items-center gap-2">
            <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-8 text-xs" />
            <span className="text-xs">—</span>
            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-8 text-xs" />
          </div>
          <Button size="sm" className="w-full h-8 mt-2" onClick={applyCustom} disabled={!customStart || !customEnd}>
            Terapkan Rentang
          </Button>
        </div>

        <div className="flex justify-between pt-1 border-t">
          <Button size="sm" variant="ghost" onClick={() => { setRange(null); setOpen(false); }}>Reset</Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Tutup</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

