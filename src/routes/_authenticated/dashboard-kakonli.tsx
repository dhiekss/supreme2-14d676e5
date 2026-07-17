import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  GraduationCap, CheckCircle2, XCircle, Clock, BarChart3, BookOpen,
  AlertTriangle, Search, FileText,
} from "lucide-react";
import { listKonsentrasiForKakonli, getKakonliDashboard } from "@/lib/dashboard-kakonli.functions";
import { getBpBkData } from "@/lib/bpbk.functions";

export const Route = createFileRoute("/_authenticated/dashboard-kakonli")({
  head: () => ({ meta: [{ title: "Dashboard Ka. Konli — SUPREME XPOES" }] }),
  component: Page,
});

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function Page() {
  const listFn = useServerFn(listKonsentrasiForKakonli);
  const { data: konliList } = useQuery({
    queryKey: ["kakonli-list"],
    queryFn: () => listFn(),
  });

  const [konsentrasi, setKonsentrasi] = useState<string>("");
  const [date] = useState<string>(todayISO());

  const dashFn = useServerFn(getKakonliDashboard);
  const { data, isLoading } = useQuery({
    enabled: !!konsentrasi,
    queryKey: ["kakonli-dashboard", konsentrasi, date],
    queryFn: () => dashFn({ data: { konsentrasi, date } }),
  });

  const bpFn = useServerFn(getBpBkData);
  const { data: bp } = useQuery({
    enabled: !!konsentrasi,
    queryKey: ["kakonli-bpbk"],
    queryFn: () => bpFn({ data: {} }),
  });

  const hariLabel = useMemo(() => {
    const d = new Date(date + "T00:00:00");
    return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, [date]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-7 w-7" /> Dashboard Ka. Prog
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{hariLabel}</p>
        </div>
      </div>

      <Card>
        <CardContent className="py-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="text-sm font-medium text-muted-foreground w-48">Konsentrasi Keahlian:</div>
          <Select value={konsentrasi} onValueChange={setKonsentrasi}>
            <SelectTrigger className="w-full md:w-96">
              <SelectValue placeholder="Pilih Konsentrasi Keahlian" />
            </SelectTrigger>
            <SelectContent>
              {(konliList ?? []).length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">Tidak ada konsentrasi yang dapat diakses</div>
              )}
              {(konliList ?? []).map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!konsentrasi ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <GraduationCap className="h-10 w-10 text-muted-foreground" />
            <div className="font-semibold">Pilih Konsentrasi Keahlian</div>
            <p className="text-sm text-muted-foreground">Silakan pilih konsentrasi untuk melihat dashboard.</p>
          </CardContent>
        </Card>
      ) : isLoading || !data ? (
        <div className="text-sm text-muted-foreground">Memuat…</div>
      ) : (
        <>
          {/* Header info konsentrasi */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5" /> {data.konsentrasi}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Jumlah Rombel</div>
                <div className="text-3xl font-bold mt-1">{data.totalRombel}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Jumlah Siswa</div>
                <div className="text-3xl font-bold mt-1">{data.totalSiswa}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-2">Rombel</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.rombels.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                  {data.rombels.map((r) => (
                    <Badge key={r.id} variant="outline" className="font-medium">{r.name}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              label="Kehadiran Bulan Ini"
              value={`${data.kehadiran.pct}%`}
              tone="emerald"
              sub={
                <>
                  <Progress value={data.kehadiran.pct} className="h-1.5 mt-2" />
                  <div className="text-xs text-muted-foreground mt-2">{data.kehadiran.H}/{data.kehadiran.total} kehadiran</div>
                </>
              }
            />
            <KpiCard
              icon={<XCircle className="h-4 w-4 text-rose-600" />}
              label="Alfa Bulan Ini"
              value={String(data.alfa.total)}
              tone="rose"
              sub={
                <>
                  <div className="text-xs text-muted-foreground mt-2">S: {data.alfa.sakit} | I: {data.alfa.izin}</div>
                  <div className="text-xs text-primary mt-1">Klik untuk lihat detail →</div>
                </>
              }
            />
            <KpiCard
              icon={<Clock className="h-4 w-4 text-amber-600" />}
              label="Terlambat Bulan Ini"
              value={String(data.terlambat.total)}
              tone="amber"
              sub={
                <>
                  <div className="text-xs text-muted-foreground mt-2">total keterlambatan</div>
                  <div className="text-xs text-primary mt-1">Klik untuk lihat detail →</div>
                </>
              }
            />
            <KpiCard
              icon={<BarChart3 className="h-4 w-4 text-violet-600" />}
              label="Realisasi KBM"
              value={`${data.kbm.pct}%`}
              tone="violet"
              sub={
                <>
                  <Progress value={data.kbm.pct} className="h-1.5 mt-2" />
                  <div className="text-xs text-muted-foreground mt-2">{data.kbm.realized}/{data.kbm.scheduled} jam bulan ini</div>
                </>
              }
            />
          </div>

          {/* SP data */}
          <SpDataCard konsentrasi={data.konsentrasi} bp={bp} rombels={data.rombels} />
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon, label, value, sub, tone,
}: { icon: React.ReactNode; label: string; value: string; sub: React.ReactNode; tone: string }) {
  const map: Record<string, string> = {
    emerald: "text-emerald-600",
    rose: "text-rose-600",
    amber: "text-amber-600",
    violet: "text-violet-600",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className={`text-3xl font-bold mt-2 ${map[tone]}`}>{value}</div>
        {sub}
      </CardContent>
    </Card>
  );
}

/* ------------------ SP data ------------------ */
type BpItem = {
  id: string;
  name: string;
  nis: string;
  rombel_id: string | null;
  rombel_name: string;
  konsentrasi: string;
  alfa: number;
  telat: number;
};
type BpSpItem = BpItem & {
  student_id: string;
  sp_level: number;
  tanggal_rekaman: string;
  alasan: string;
  jumlah_alfa: number;
  jumlah_terlambat: number;
  student_name: string;
  student_nis: string;
};

function SpDataCard({
  konsentrasi, bp, rombels,
}: {
  konsentrasi: string;
  bp: any;
  rombels: { id: string; name: string; tingkat: string | null }[];
}) {
  const [q, setQ] = useState("");
  const [rombelFilter, setRombelFilter] = useState<string>("all");
  const rombelIdSet = useMemo(() => new Set(rombels.map((r) => r.id)), [rombels]);

  const filterByRombel = <T extends { rombel_id: string | null }>(rows: T[]) =>
    rows.filter((r) => (r.rombel_id ? rombelIdSet.has(r.rombel_id) : false))
        .filter((r) => rombelFilter === "all" || r.rombel_id === rombelFilter);

  const filterBySearch = <T extends { name?: string; student_name?: string; nis?: string; student_nis?: string }>(rows: T[]) => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => `${r.name ?? r.student_name ?? ""} ${r.nis ?? r.student_nis ?? ""}`.toLowerCase().includes(s));
  };

  const rek1 = useMemo(() => filterBySearch(filterByRombel((bp?.rekomendasi?.[1] ?? []) as BpItem[])), [bp, q, rombelFilter, rombelIdSet]);
  const rek2 = useMemo(() => filterBySearch(filterByRombel((bp?.rekomendasi?.[2] ?? []) as BpItem[])), [bp, q, rombelFilter, rombelIdSet]);
  const rek3 = useMemo(() => filterBySearch(filterByRombel((bp?.rekomendasi?.[3] ?? []) as BpItem[])), [bp, q, rombelFilter, rombelIdSet]);
  const sp1 = useMemo(() => filterBySearch(filterByRombel((bp?.murid?.[1] ?? []) as BpSpItem[])), [bp, q, rombelFilter, rombelIdSet]);
  const sp2 = useMemo(() => filterBySearch(filterByRombel((bp?.murid?.[2] ?? []) as BpSpItem[])), [bp, q, rombelFilter, rombelIdSet]);
  const sp3 = useMemo(() => filterBySearch(filterByRombel((bp?.murid?.[3] ?? []) as BpSpItem[])), [bp, q, rombelFilter, rombelIdSet]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-amber-500" /> Data Surat Peringatan (SP) – {konsentrasi}
        </CardTitle>
        <p className="text-xs text-muted-foreground">Data murid berdasarkan rekomendasi dan status SP di seluruh rombel</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau NIS…" className="pl-9" />
          </div>
          <Select value={rombelFilter} onValueChange={setRombelFilter}>
            <SelectTrigger className="w-full md:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Rombel</SelectItem>
              {rombels.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="rek1" className="space-y-3">
          <TabsList className="flex-wrap h-auto">
            <TabTrig value="rek1" label="Rek. SP 1" count={rek1.length} tone="rose" />
            <TabTrig value="sp1" label="SP 1" count={sp1.length} />
            <TabTrig value="rek2" label="Rek. SP 2" count={rek2.length} tone="rose" />
            <TabTrig value="sp2" label="SP 2" count={sp2.length} />
            <TabTrig value="rek3" label="Rek. SP 3" count={rek3.length} tone="rose" />
            <TabTrig value="sp3" label="SP 3" count={sp3.length} />
          </TabsList>

          <TabsContent value="rek1"><RekTable rows={rek1} /></TabsContent>
          <TabsContent value="rek2"><RekTable rows={rek2} /></TabsContent>
          <TabsContent value="rek3"><RekTable rows={rek3} /></TabsContent>
          <TabsContent value="sp1"><SpTable rows={sp1} /></TabsContent>
          <TabsContent value="sp2"><SpTable rows={sp2} /></TabsContent>
          <TabsContent value="sp3"><SpTable rows={sp3} /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TabTrig({ value, label, count, tone }: { value: string; label: string; count: number; tone?: string }) {
  return (
    <TabsTrigger value={value} className="gap-2">
      {label}
      <Badge
        className={
          count === 0
            ? "bg-muted text-muted-foreground hover:bg-muted"
            : tone === "rose"
            ? "bg-rose-500 text-white hover:bg-rose-500"
            : "bg-primary text-primary-foreground hover:bg-primary"
        }
      >
        {count}
      </Badge>
    </TabsTrigger>
  );
}

function RekTable({ rows }: { rows: BpItem[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">No</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead className="w-36">NIS</TableHead>
            <TableHead className="w-40">Rombel</TableHead>
            <TableHead className="w-24 text-center">Jml Alfa</TableHead>
            <TableHead className="w-28 text-center">Jml Terlambat</TableHead>
            <TableHead className="w-28 text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Tidak ada rekomendasi.</TableCell></TableRow>
          ) : rows.map((r, i) => (
            <TableRow key={r.id}>
              <TableCell className="text-primary font-medium">{i + 1}</TableCell>
              <TableCell className="font-medium uppercase">{r.name}</TableCell>
              <TableCell className="text-muted-foreground">{r.nis}</TableCell>
              <TableCell><Badge variant="outline">{r.rombel_name}</Badge></TableCell>
              <TableCell className="text-center"><NumBadge n={r.alfa} threshold={3} /></TableCell>
              <TableCell className="text-center"><NumBadge n={r.telat} threshold={5} /></TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" variant="outline">
                  <Link to="/sp"><FileText className="h-3.5 w-3.5 mr-1.5" /> Surat</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SpTable({ rows }: { rows: BpSpItem[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">No</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead className="w-36">NIS</TableHead>
            <TableHead className="w-40">Rombel</TableHead>
            <TableHead className="w-32">Tanggal</TableHead>
            <TableHead>Alasan</TableHead>
            <TableHead className="w-28 text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Belum ada murid dengan SP di level ini.</TableCell></TableRow>
          ) : rows.map((r, i) => (
            <TableRow key={r.id}>
              <TableCell className="text-primary font-medium">{i + 1}</TableCell>
              <TableCell className="font-medium uppercase">{r.student_name}</TableCell>
              <TableCell className="text-muted-foreground">{r.student_nis}</TableCell>
              <TableCell><Badge variant="outline">{r.rombel_name}</Badge></TableCell>
              <TableCell className="text-xs">{r.tanggal_rekaman}</TableCell>
              <TableCell className="text-xs text-muted-foreground truncate max-w-[280px]">{r.alasan || "—"}</TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" variant="outline">
                  <Link to="/sp"><FileText className="h-3.5 w-3.5 mr-1.5" /> Detail</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function NumBadge({ n, threshold }: { n: number; threshold: number }) {
  const over = n > threshold;
  return (
    <Badge className={over ? "bg-rose-500 text-white hover:bg-rose-500" : "bg-muted text-foreground hover:bg-muted"}>
      {n}
    </Badge>
  );
}
