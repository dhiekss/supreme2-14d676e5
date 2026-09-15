import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { BarChart3, Users, BookOpen, AlertTriangle, TrendingUp, TrendingDown, Search, GraduationCap } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Cell,
} from "recharts";
import { getDashboardNilai } from "@/lib/dashboard-nilai.functions";

export const Route = createFileRoute("/_authenticated/pembelajaran/dashboard-nilai")({
  head: () => ({
    meta: [
      { title: "Dashboard Nilai — Analisis Nilai Murid" },
      { name: "description", content: "Analisis capaian nilai murid per tingkat, konsentrasi keahlian, mata pelajaran, dan guru pengampu." },
      { property: "og:title", content: "Dashboard Nilai — Analisis Nilai Murid" },
      { property: "og:description", content: "Pantau kelengkapan input nilai guru dan peringkat nilai murid." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const ALL = "__all__";
const fmt = (n: number | null | undefined, d = 1) => (n === null || n === undefined || !Number.isFinite(n) ? "—" : n.toFixed(d));

function Kpi({ icon: Icon, label, value, hint, tone = "default" }: any) {
  const tones: Record<string, string> = {
    default: "text-primary",
    warn: "text-amber-600",
    bad: "text-destructive",
    good: "text-emerald-600",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
          </div>
          <Icon className={`h-5 w-5 ${tones[tone]}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

function Page() {
  const fn = useServerFn(getDashboardNilai);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-nilai"], queryFn: () => fn() });

  const [tingkat, setTingkat] = useState(ALL);
  const [konsentrasi, setKonsentrasi] = useState(ALL);
  const [mapel, setMapel] = useState(ALL);
  const [guru, setGuru] = useState(ALL);
  const [q, setQ] = useState("");

  const assignments = data?.assignments ?? [];
  const scores = data?.studentScores ?? [];

  const opts = useMemo(() => {
    const t = new Set<string>(), k = new Set<string>(), m = new Map<string, string>(), g = new Map<string, string>();
    for (const a of assignments) {
      if (a.tingkat) t.add(a.tingkat);
      if (a.konsentrasi) k.add(a.konsentrasi);
      if (a.mapel_id) m.set(a.mapel_id, a.mapel_name);
      if (a.guru_id) g.set(a.guru_id, a.guru_name);
    }
    return {
      tingkat: [...t].sort(),
      konsentrasi: [...k].sort(),
      mapel: [...m].entries ? [...m.entries()].sort((x, y) => x[1].localeCompare(y[1])) : [],
      guru: [...g.entries()].sort((x, y) => x[1].localeCompare(y[1])),
    };
  }, [assignments]);

  const matchA = (a: any) =>
    (tingkat === ALL || a.tingkat === tingkat) &&
    (konsentrasi === ALL || a.konsentrasi === konsentrasi) &&
    (mapel === ALL || a.mapel_id === mapel) &&
    (guru === ALL || a.guru_id === guru);

  const fa = useMemo(() => assignments.filter(matchA), [assignments, tingkat, konsentrasi, mapel, guru]);
  const fs = useMemo(
    () =>
      scores.filter(
        (s: any) =>
          (tingkat === ALL || s.tingkat === tingkat) &&
          (konsentrasi === ALL || s.konsentrasi === konsentrasi) &&
          (mapel === ALL || s.mapel_id === mapel) &&
          (guru === ALL || s.guru_name === (opts.guru.find(([id]) => id === guru)?.[1] ?? "")),
      ),
    [scores, tingkat, konsentrasi, mapel, guru, opts.guru],
  );

  const totals = useMemo(() => {
    const expected = fa.reduce((s, a) => s + a.expected, 0);
    const filled = fa.reduce((s, a) => s + a.filled, 0);
    const withGrades = fa.filter((a) => a.filled > 0);
    const avg = withGrades.length
      ? fa.reduce((s, a) => s + (a.avg ?? 0) * a.filled, 0) / Math.max(1, filled)
      : null;
    return {
      expected,
      filled,
      kosong: fa.filter((a) => a.filled === 0).length,
      belumLengkap: fa.filter((a) => a.filled > 0 && a.filled < a.expected).length,
      kelas: fa.length,
      avg,
    };
  }, [fa]);

  // per-student overall
  const studentRank = useMemo(() => {
    const map = new Map<string, any>();
    for (const s of fs) {
      const cur = map.get(s.student_id) ?? {
        student_id: s.student_id, student_name: s.student_name, nis: s.nis,
        rombel_name: s.rombel_name, tingkat: s.tingkat, konsentrasi: s.konsentrasi,
        sum: 0, count: 0, mapelCount: 0,
      };
      cur.sum += s.avg * s.count;
      cur.count += s.count;
      cur.mapelCount += 1;
      map.set(s.student_id, cur);
    }
    return [...map.values()]
      .map((x) => ({ ...x, avg: x.count ? x.sum / x.count : 0 }))
      .sort((a, b) => b.avg - a.avg);
  }, [fs]);

  const byMapel = useMemo(() => {
    const map = new Map<string, any>();
    for (const a of fa) {
      const cur = map.get(a.mapel_id) ?? { id: a.mapel_id, name: a.mapel_name, sum: 0, filled: 0, expected: 0, kelas: 0, kosong: 0 };
      cur.sum += (a.avg ?? 0) * a.filled;
      cur.filled += a.filled;
      cur.expected += a.expected;
      cur.kelas += 1;
      if (a.filled === 0) cur.kosong += 1;
      map.set(a.mapel_id, cur);
    }
    return [...map.values()]
      .map((x) => ({ ...x, avg: x.filled ? x.sum / x.filled : null, progress: pct(x.filled, x.expected) }))
      .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
  }, [fa]);

  const byGuru = useMemo(() => {
    const map = new Map<string, any>();
    for (const a of fa) {
      const key = a.guru_id ?? "none";
      const cur = map.get(key) ?? { id: key, name: a.guru_name, sum: 0, filled: 0, expected: 0, kelas: 0, kosong: 0, mapel: new Set<string>() };
      cur.sum += (a.avg ?? 0) * a.filled;
      cur.filled += a.filled;
      cur.expected += a.expected;
      cur.kelas += 1;
      if (a.filled === 0) cur.kosong += 1;
      cur.mapel.add(a.mapel_name);
      map.set(key, cur);
    }
    return [...map.values()]
      .map((x) => ({ ...x, mapelList: [...x.mapel].join(", "), avg: x.filled ? x.sum / x.filled : null, progress: pct(x.filled, x.expected) }))
      .sort((a, b) => a.progress - b.progress);
  }, [fa]);

  const byTingkat = useMemo(() => {
    const map = new Map<string, any>();
    for (const a of fa) {
      const cur = map.get(a.tingkat) ?? { name: a.tingkat, sum: 0, filled: 0, expected: 0 };
      cur.sum += (a.avg ?? 0) * a.filled;
      cur.filled += a.filled;
      cur.expected += a.expected;
      map.set(a.tingkat, cur);
    }
    return [...map.values()].map((x) => ({ ...x, avg: x.filled ? Number((x.sum / x.filled).toFixed(2)) : 0, progress: pct(x.filled, x.expected) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [fa]);

  const byKonsentrasi = useMemo(() => {
    const map = new Map<string, any>();
    for (const a of fa) {
      const cur = map.get(a.konsentrasi) ?? { name: a.konsentrasi, sum: 0, filled: 0, expected: 0 };
      cur.sum += (a.avg ?? 0) * a.filled;
      cur.filled += a.filled;
      cur.expected += a.expected;
      map.set(a.konsentrasi, cur);
    }
    return [...map.values()].map((x) => ({ ...x, avg: x.filled ? Number((x.sum / x.filled).toFixed(2)) : 0, progress: pct(x.filled, x.expected) }))
      .sort((a, b) => b.avg - a.avg);
  }, [fa]);

  const kosongList = useMemo(
    () => fa.filter((a) => a.filled === 0).sort((a, b) => `${a.guru_name}${a.rombel_name}`.localeCompare(`${b.guru_name}${b.rombel_name}`)),
    [fa],
  );

  const search = q.trim().toLowerCase();
  const rankFiltered = search
    ? studentRank.filter((s) => `${s.student_name} ${s.nis ?? ""} ${s.rombel_name}`.toLowerCase().includes(search))
    : studentRank;

  const barColor = (v: number) => (v >= 80 ? "hsl(var(--primary))" : v >= 70 ? "#f59e0b" : "hsl(var(--destructive))");

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Dashboard Nilai
          </h1>
          <p className="text-sm text-muted-foreground">
            Semester aktif: {data?.semester?.nama ?? "—"}
            {data?.scoped ? " • menampilkan kelas yang Anda ampu" : ""}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Tingkat</p>
            <Select value={tingkat} onValueChange={setTingkat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Tingkat</SelectItem>
                {opts.tingkat.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Konsentrasi Keahlian</p>
            <Select value={konsentrasi} onValueChange={setKonsentrasi}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Konsentrasi</SelectItem>
                {opts.konsentrasi.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Mata Pelajaran</p>
            <Select value={mapel} onValueChange={setMapel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Mapel</SelectItem>
                {opts.mapel.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Guru Pengampu</p>
            <Select value={guru} onValueChange={setGuru}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Guru</SelectItem>
                {opts.guru.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Kpi icon={GraduationCap} label="Rata-rata Nilai" value={fmt(totals.avg, 2)} hint={`${totals.filled} nilai terhimpun`} tone="good" />
        <Kpi icon={BookOpen} label="Kelas × Mapel" value={totals.kelas} hint="penugasan aktif" />
        <Kpi icon={TrendingUp} label="Kelengkapan" value={`${pct(totals.filled, totals.expected)}%`} hint={`${totals.filled} dari ${totals.expected}`} />
        <Kpi icon={AlertTriangle} label="Belum Ada Nilai" value={totals.kosong} hint="kelas × mapel kosong" tone="bad" />
        <Kpi icon={Users} label="Murid Dinilai" value={studentRank.length} hint={`${totals.belumLengkap} kelas belum lengkap`} tone="warn" />
      </div>

      <Tabs defaultValue="ringkasan">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
          <TabsTrigger value="kelengkapan">Kelengkapan Guru</TabsTrigger>
          <TabsTrigger value="kosong">Belum Dinilai {totals.kosong ? <Badge variant="destructive" className="ml-2">{totals.kosong}</Badge> : null}</TabsTrigger>
          <TabsTrigger value="peringkat">Peringkat Murid</TabsTrigger>
        </TabsList>

        <TabsContent value="ringkasan" className="space-y-4 mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Rata-rata per Tingkat</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byTingkat}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis domain={[0, 100]} fontSize={12} />
                    <RTooltip />
                    <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                      {byTingkat.map((d, i) => <Cell key={i} fill={barColor(d.avg)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Rata-rata per Konsentrasi Keahlian</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byKonsentrasi} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} fontSize={12} />
                    <YAxis type="category" dataKey="name" width={120} fontSize={11} />
                    <RTooltip />
                    <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                      {byKonsentrasi.map((d, i) => <Cell key={i} fill={barColor(d.avg)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Rekap per Mata Pelajaran</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead className="text-right">Kelas</TableHead>
                    <TableHead className="text-right">Rata-rata</TableHead>
                    <TableHead className="w-48">Kelengkapan</TableHead>
                    <TableHead className="text-right">Kelas Kosong</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byMapel.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-right">{m.kelas}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(m.avg, 2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={m.progress} className="h-2" />
                          <span className="text-xs text-muted-foreground w-10 text-right">{m.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {m.kosong ? <Badge variant="destructive">{m.kosong}</Badge> : <Badge variant="secondary">0</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!byMapel.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{isLoading ? "Memuat data…" : "Tidak ada data"}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kelengkapan" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Progres Input Nilai per Guru</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guru</TableHead>
                    <TableHead>Mapel Diampu</TableHead>
                    <TableHead className="text-right">Kelas</TableHead>
                    <TableHead className="text-right">Kelas Kosong</TableHead>
                    <TableHead className="text-right">Rata-rata</TableHead>
                    <TableHead className="w-48">Kelengkapan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byGuru.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">{g.mapelList}</TableCell>
                      <TableCell className="text-right">{g.kelas}</TableCell>
                      <TableCell className="text-right">{g.kosong ? <Badge variant="destructive">{g.kosong}</Badge> : <Badge variant="secondary">0</Badge>}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(g.avg, 2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={g.progress} className="h-2" />
                          <span className="text-xs text-muted-foreground w-10 text-right">{g.progress}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!byGuru.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{isLoading ? "Memuat data…" : "Tidak ada data"}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kosong" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Kelas & Mapel Belum Ada Nilai</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guru</TableHead>
                    <TableHead>Rombel</TableHead>
                    <TableHead>Mapel</TableHead>
                    <TableHead>Konsentrasi</TableHead>
                    <TableHead className="text-right">Jumlah TP</TableHead>
                    <TableHead className="text-right">Jumlah Murid</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kosongList.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.guru_name}</TableCell>
                      <TableCell>{a.rombel_name}</TableCell>
                      <TableCell>{a.mapel_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.konsentrasi}</TableCell>
                      <TableCell className="text-right">{a.tpCount}</TableCell>
                      <TableCell className="text-right">{a.studentCount}</TableCell>
                      <TableCell>
                        {a.tpCount === 0
                          ? <Badge variant="destructive">Belum ada Tujuan Pembelajaran</Badge>
                          : <Badge variant="outline">TP ada, nilai kosong</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!kosongList.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{isLoading ? "Memuat data…" : "Semua kelas sudah memiliki nilai"}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="peringkat" className="space-y-4 mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> 10 Nilai Tertinggi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {studentRank.slice(0, 10).map((s, i) => (
                  <div key={s.student_id} className="flex items-center gap-3 text-sm">
                    <span className="w-6 text-muted-foreground">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{s.student_name}</p>
                      <p className="text-xs text-muted-foreground">{s.rombel_name} • {s.nis ?? "-"}</p>
                    </div>
                    <Badge variant="secondary">{fmt(s.avg, 2)}</Badge>
                  </div>
                ))}
                {!studentRank.length && <p className="text-sm text-muted-foreground py-6 text-center">Belum ada nilai</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4 text-destructive" /> 10 Nilai Terendah</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[...studentRank].reverse().slice(0, 10).map((s, i) => (
                  <div key={s.student_id} className="flex items-center gap-3 text-sm">
                    <span className="w-6 text-muted-foreground">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{s.student_name}</p>
                      <p className="text-xs text-muted-foreground">{s.rombel_name} • {s.nis ?? "-"}</p>
                    </div>
                    <Badge variant="destructive">{fmt(s.avg, 2)}</Badge>
                  </div>
                ))}
                {!studentRank.length && <p className="text-sm text-muted-foreground py-6 text-center">Belum ada nilai</p>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">Daftar Peringkat Murid</CardTitle>
              <div className="relative w-64 max-w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / NIS / rombel" className="pl-8" />
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Nama Murid</TableHead>
                    <TableHead>NIS</TableHead>
                    <TableHead>Rombel</TableHead>
                    <TableHead>Konsentrasi</TableHead>
                    <TableHead className="text-right">Mapel Dinilai</TableHead>
                    <TableHead className="text-right">Rata-rata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankFiltered.slice(0, 200).map((s, i) => (
                    <TableRow key={s.student_id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.student_name}</TableCell>
                      <TableCell>{s.nis ?? "-"}</TableCell>
                      <TableCell>{s.rombel_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.konsentrasi}</TableCell>
                      <TableCell className="text-right">{s.mapelCount}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(s.avg, 2)}</TableCell>
                    </TableRow>
                  ))}
                  {!rankFiltered.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{isLoading ? "Memuat data…" : "Tidak ada data"}</TableCell></TableRow>}
                </TableBody>
              </Table>
              {rankFiltered.length > 200 && (
                <p className="text-xs text-muted-foreground mt-2">Menampilkan 200 dari {rankFiltered.length} murid. Gunakan filter atau pencarian untuk mempersempit.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
