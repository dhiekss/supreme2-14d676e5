import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { presensiDashboard } from "@/lib/presensi-report.functions";
import {
  Download, Users, GraduationCap, School, CalendarCheck, CheckCircle2,
  Thermometer, FileText, XCircle, Briefcase, ClipboardList, AlertTriangle,
  TrendingUp, PieChart as PieIcon, BarChart3,
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
    a.download = `laporan-presensi-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan Presensi</h1>
          <p className="text-sm text-muted-foreground">Rekap kehadiran seluruh rombel dalam rentang tanggal.</p>
        </div>
        <Button onClick={exportCsv} disabled={!data} className="gap-2">
          <Download className="h-4 w-4" /> Ekspor Data CSV
        </Button>
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

      {/* Rombel belum input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Rombel Belum Input Presensi
          </CardTitle>
          <p className="text-xs text-muted-foreground">Daftar rombel tanpa catatan presensi pada rentang tanggal terpilih.</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">No</TableHead>
                <TableHead>Nama Rombel</TableHead>
                <TableHead>Wali Kelas</TableHead>
                <TableHead className="text-right">Jumlah Hari</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.rombelBelum ?? []).map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.walikelas ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="destructive">0 hari</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {data && data.rombelBelum.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Semua rombel telah input presensi.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Detail Presensi
          </CardTitle>
          <p className="text-xs text-muted-foreground">100 catatan terbaru dalam rentang tanggal.</p>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Rombel</TableHead>
                <TableHead>Wali Kelas</TableHead>
                <TableHead className="text-center">H</TableHead>
                <TableHead className="text-center">S</TableHead>
                <TableHead className="text-center">I</TableHead>
                <TableHead className="text-center">A</TableHead>
                <TableHead className="text-center">P</TableHead>
                <TableHead className="text-center">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.detailRows ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{r.date}</TableCell>
                  <TableCell className="font-medium">{r.rombel}</TableCell>
                  <TableCell>{r.walikelas}</TableCell>
                  <TableCell className="text-center text-emerald-600 font-medium">{r.H}</TableCell>
                  <TableCell className="text-center text-amber-600">{r.S}</TableCell>
                  <TableCell className="text-center text-sky-600">{r.I}</TableCell>
                  <TableCell className="text-center text-rose-600 font-medium">{r.A}</TableCell>
                  <TableCell className="text-center text-violet-600">{r.P}</TableCell>
                  <TableCell className="text-center font-semibold">{r.total}</TableCell>
                </TableRow>
              ))}
              {data && data.detailRows.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Belum ada catatan presensi.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isFetching && <p className="text-xs text-muted-foreground text-center">Memuat data...</p>}
    </div>
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
