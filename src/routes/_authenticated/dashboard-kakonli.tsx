import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useEffect } from "react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
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

const MONTH_NAMES = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function firstOfMonth(y: number, m0: number) {
  return `${y}-${String(m0 + 1).padStart(2, "0")}-01`;
}
function lastOfMonth(y: number, m0: number) {
  const d = new Date(y, m0 + 1, 0);
  return `${y}-${String(m0 + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Page() {
  const listFn = useServerFn(listKonsentrasiForKakonli);
  const { data: konliList } = useQuery({
    queryKey: ["kakonli-list"],
    queryFn: () => listFn(),
  });

  const [konsentrasi, setKonsentrasi] = useState<string>("");
  const [mode, setMode] = useState<"month" | "semester" | "custom">("month");
  const [monthKey, setMonthKey] = useState<string>(""); // "YYYY-MM"
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  // Preload semester meta by fetching once with any konsentrasi? We need semester bounds first.
  // Trick: fire dashboard even without range to get semester bounds; then set default month.
  const dashFn = useServerFn(getKakonliDashboard);

  const range = useMemo(() => {
    if (mode === "custom" && customStart && customEnd) return { startDate: customStart, endDate: customEnd };
    if (mode === "month" && monthKey) {
      const [ys, ms] = monthKey.split("-");
      const y = Number(ys), m0 = Number(ms) - 1;
      return { startDate: firstOfMonth(y, m0), endDate: lastOfMonth(y, m0) };
    }
    return undefined;
  }, [mode, monthKey, customStart, customEnd]);

  const { data, isLoading } = useQuery({
    enabled: !!konsentrasi,
    queryKey: ["kakonli-dashboard", konsentrasi, mode, range?.startDate, range?.endDate],
    queryFn: () => dashFn({ data: { konsentrasi, ...(range ?? {}) } }),
  });

  // When semester loads and no monthKey chosen yet, default to current month clamped inside semester
  const semStart = data?.semester?.tanggal_mulai ?? null;
  const semEnd = data?.semester?.tanggal_selesai ?? null;

  useEffect(() => {
    if (mode === "month" && !monthKey && semStart && semEnd) {
      const now = new Date();
      const todayIso = now.toISOString().slice(0, 10);
      let ref = todayIso;
      if (ref < semStart) ref = semStart;
      if (ref > semEnd) ref = semEnd;
      setMonthKey(ref.slice(0, 7));
    }
  }, [semStart, semEnd, mode, monthKey]);

  const monthOptions = useMemo(() => {
    if (!semStart || !semEnd) return [] as { key: string; label: string }[];
    const out: { key: string; label: string }[] = [];
    const s = new Date(semStart + "T00:00:00");
    const e = new Date(semEnd + "T00:00:00");
    let y = s.getFullYear(), m0 = s.getMonth();
    while (y < e.getFullYear() || (y === e.getFullYear() && m0 <= e.getMonth())) {
      out.push({ key: `${y}-${String(m0 + 1).padStart(2, "0")}`, label: `${MONTH_NAMES[m0]} ${y}` });
      m0++;
      if (m0 > 11) { m0 = 0; y++; }
    }
    return out;
  }, [semStart, semEnd]);

  const bpFn = useServerFn(getBpBkData);
  const { data: bp } = useQuery({
    enabled: !!konsentrasi,
    queryKey: ["kakonli-bpbk"],
    queryFn: () => bpFn({ data: {} }),
  });

  const [detail, setDetail] = useState<null | "kehadiran" | "alfa" | "terlambat" | "kbm">(null);

  const rangeLabel = useMemo(() => {
    if (!data) return "";
    const s = data.range.startDate;
    const e = data.range.endDate;
    const fmt = (x: string) => new Date(x + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    return `${fmt(s)} — ${fmt(e)}`;
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-7 w-7" /> Dashboard Ka. Konli
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.semester?.nama ? `${data.semester.nama}${data.tahunAjaran?.nama ? ` · ${data.tahunAjaran.nama}` : ""}` : "Semester aktif"}
            {rangeLabel && <span className="ml-2">· {rangeLabel}</span>}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="py-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="text-sm font-medium text-muted-foreground w-40">Konsentrasi Keahlian:</div>
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
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="text-sm font-medium text-muted-foreground w-40">Periode:</div>
            <Select value={mode} onValueChange={(v) => setMode(v as any)}>
              <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Per Bulan</SelectItem>
                <SelectItem value="semester">Rentang Semester</SelectItem>
                <SelectItem value="custom">Rentang Kustom</SelectItem>
              </SelectContent>
            </Select>

            {mode === "month" && (
              <Select value={monthKey} onValueChange={setMonthKey}>
                <SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Pilih bulan" /></SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {mode === "custom" && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={customStart}
                  min={semStart ?? undefined}
                  max={semEnd ?? undefined}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-40"
                />
                <span className="text-muted-foreground text-sm">s/d</span>
                <Input
                  type="date"
                  value={customEnd}
                  min={semStart ?? undefined}
                  max={semEnd ?? undefined}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-40"
                />
              </div>
            )}
          </div>
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

          {/* KPI cards (clickable) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              onClick={() => setDetail("kehadiran")}
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              label="Kehadiran"
              value={`${data.kehadiran.pct}%`}
              tone="emerald"
              sub={
                <>
                  <Progress value={data.kehadiran.pct} className="h-1.5 mt-2" />
                  <div className="text-xs text-muted-foreground mt-2">{data.kehadiran.H}/{data.kehadiran.total} kehadiran</div>
                  <div className="text-xs text-primary mt-1">Klik untuk lihat detail →</div>
                </>
              }
            />
            <KpiCard
              onClick={() => setDetail("alfa")}
              icon={<XCircle className="h-4 w-4 text-rose-600" />}
              label="Alfa"
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
              onClick={() => setDetail("terlambat")}
              icon={<Clock className="h-4 w-4 text-amber-600" />}
              label="Terlambat"
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
              onClick={() => setDetail("kbm")}
              icon={<BarChart3 className="h-4 w-4 text-violet-600" />}
              label="Realisasi KBM"
              value={`${data.kbm.pct}%`}
              tone="violet"
              sub={
                <>
                  <Progress value={data.kbm.pct} className="h-1.5 mt-2" />
                  <div className="text-xs text-muted-foreground mt-2">{data.kbm.realized}/{data.kbm.scheduled} jam</div>
                  <div className="text-xs text-primary mt-1">Klik untuk lihat detail →</div>
                </>
              }
            />
          </div>

          <SpDataCard konsentrasi={data.konsentrasi} bp={bp} rombels={data.rombels} />

          <DetailDialog
            open={!!detail}
            kind={detail}
            data={data}
            rangeLabel={rangeLabel}
            onOpenChange={(o) => { if (!o) setDetail(null); }}
          />
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon, label, value, sub, tone, onClick,
}: { icon: React.ReactNode; label: string; value: string; sub: React.ReactNode; tone: string; onClick?: () => void }) {
  const map: Record<string, string> = {
    emerald: "text-emerald-600",
    rose: "text-rose-600",
    amber: "text-amber-600",
    violet: "text-violet-600",
  };
  return (
    <Card
      onClick={onClick}
      className={onClick ? "cursor-pointer transition-shadow hover:shadow-md" : undefined}
    >
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

/* ------------------ Detail Dialog ------------------ */

function DetailDialog({
  open, kind, data, rangeLabel, onOpenChange,
}: {
  open: boolean;
  kind: null | "kehadiran" | "alfa" | "terlambat" | "kbm";
  data: any;
  rangeLabel: string;
  onOpenChange: (o: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const [rombelFilter, setRombelFilter] = useState<string>("all");
  useEffect(() => { if (!open) { setQ(""); setRombelFilter("all"); } }, [open]);

  const rombels: { id: string; name: string }[] = data?.rombels ?? [];

  const matchesSearch = (name: string, nis: string) =>
    !q.trim() || `${name} ${nis}`.toLowerCase().includes(q.trim().toLowerCase());

  const title =
    kind === "kehadiran" ? "Detail Kehadiran Siswa" :
    kind === "alfa" ? "Detail Alfa Siswa" :
    kind === "terlambat" ? "Detail Keterlambatan Siswa" :
    kind === "kbm" ? "Detail Realisasi KBM per Rombel" : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-xs text-muted-foreground">{rangeLabel}</p>
        </DialogHeader>

        {kind !== "kbm" && (
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
        )}

        <div className="overflow-auto flex-1 rounded-lg border">
          {kind === "kehadiran" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="w-32">NIS</TableHead>
                  <TableHead className="w-40">Rombel</TableHead>
                  <TableHead className="w-16 text-center">H</TableHead>
                  <TableHead className="w-16 text-center">S</TableHead>
                  <TableHead className="w-16 text-center">I</TableHead>
                  <TableHead className="w-16 text-center">A</TableHead>
                  <TableHead className="w-16 text-center">P</TableHead>
                  <TableHead className="w-20 text-center">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.kehadiran.list as any[])
                  .filter((r) => rombelFilter === "all" || r.rombel_name === rombelNameOf(rombels, rombelFilter))
                  .filter((r) => matchesSearch(r.name, r.nis))
                  .map((r, i) => (
                    <TableRow key={r.student_id}>
                      <TableCell className="text-primary font-medium">{i + 1}</TableCell>
                      <TableCell className="font-medium uppercase">{r.name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.nis}</TableCell>
                      <TableCell><Badge variant="outline">{r.rombel_name}</Badge></TableCell>
                      <TableCell className="text-center">{r.H}</TableCell>
                      <TableCell className="text-center">{r.S}</TableCell>
                      <TableCell className="text-center">{r.I}</TableCell>
                      <TableCell className="text-center">{r.A}</TableCell>
                      <TableCell className="text-center">{r.P}</TableCell>
                      <TableCell className="text-center font-semibold">{r.pct}%</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}

          {kind === "alfa" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="w-32">NIS</TableHead>
                  <TableHead className="w-40">Rombel</TableHead>
                  <TableHead className="w-20 text-center">Alfa</TableHead>
                  <TableHead className="w-20 text-center">Sakit</TableHead>
                  <TableHead className="w-20 text-center">Izin</TableHead>
                  <TableHead>Tanggal Alfa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.alfa.list as any[])
                  .filter((r) => rombelFilter === "all" || r.rombel_name === rombelNameOf(rombels, rombelFilter))
                  .filter((r) => matchesSearch(r.name, r.nis))
                  .map((r, i) => (
                    <TableRow key={r.student_id}>
                      <TableCell className="text-primary font-medium">{i + 1}</TableCell>
                      <TableCell className="font-medium uppercase">{r.name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.nis}</TableCell>
                      <TableCell><Badge variant="outline">{r.rombel_name}</Badge></TableCell>
                      <TableCell className="text-center"><Badge className="bg-rose-500 text-white hover:bg-rose-500">{r.alfa}</Badge></TableCell>
                      <TableCell className="text-center">{r.sakit}</TableCell>
                      <TableCell className="text-center">{r.izin}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.dates.join(", ") || "—"}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}

          {kind === "terlambat" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="w-32">NIS</TableHead>
                  <TableHead className="w-40">Rombel</TableHead>
                  <TableHead className="w-24 text-center">Terlambat</TableHead>
                  <TableHead>Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.terlambat.list as any[])
                  .filter((r) => rombelFilter === "all" || r.rombel_name === rombelNameOf(rombels, rombelFilter))
                  .filter((r) => matchesSearch(r.name, r.nis))
                  .map((r, i) => (
                    <TableRow key={r.student_id}>
                      <TableCell className="text-primary font-medium">{i + 1}</TableCell>
                      <TableCell className="font-medium uppercase">{r.name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.nis}</TableCell>
                      <TableCell><Badge variant="outline">{r.rombel_name}</Badge></TableCell>
                      <TableCell className="text-center"><Badge className="bg-amber-500 text-white hover:bg-amber-500">{r.count}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.dates.join(", ") || "—"}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}

          {kind === "kbm" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Rombel</TableHead>
                  <TableHead className="w-32 text-center">Terealisasi</TableHead>
                  <TableHead className="w-32 text-center">Total Sesi</TableHead>
                  <TableHead className="w-24 text-center">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.kbm.list as any[]).map((r, i) => (
                  <TableRow key={r.rombel_id}>
                    <TableCell className="text-primary font-medium">{i + 1}</TableCell>
                    <TableCell><Badge variant="outline">{r.rombel_name}</Badge></TableCell>
                    <TableCell className="text-center">{r.realized}</TableCell>
                    <TableCell className="text-center">{r.total}</TableCell>
                    <TableCell className="text-center font-semibold">{r.pct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function rombelNameOf(rombels: { id: string; name: string }[], id: string) {
  return rombels.find((r) => r.id === id)?.name ?? "";
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
