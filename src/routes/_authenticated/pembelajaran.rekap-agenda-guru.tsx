import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, CheckCircle2, XCircle, AlertCircle, Users, Download, RefreshCw, ClipboardList, Search, Eye, Pencil, TableIcon, ArrowUpDown } from "lucide-react";
import { getRekapAgendaGuru, listRekapOptions } from "@/lib/rekap-agenda.functions";
import { getAgendaDetail } from "@/lib/agenda-guru.functions";
import { useServerFn } from "@tanstack/react-start";
import * as XLSX from "xlsx";

function firstOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function lastOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

const optsQO = queryOptions({
  queryKey: ["rekap-agenda-options"],
  queryFn: () => listRekapOptions(),
});

export const Route = createFileRoute("/_authenticated/pembelajaran/rekap-agenda-guru")({
  head: () => ({ meta: [{ title: "Rekap Agenda Guru — SUPREME EXPOES" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(optsQO),
  component: RekapAgendaGuruPage,
  errorComponent: ({ error }) => <div className="text-destructive p-6">Gagal memuat: {error.message}</div>,
});

function RekapAgendaGuruPage() {
  const opts = useSuspenseQuery(optsQO).data;
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(lastOfMonth());
  const [guruId, setGuruId] = useState<string>("all");
  const [rombelId, setRombelId] = useState<string>("all");

  const dataQ = useQuery({
    queryKey: ["rekap-agenda-guru", from, to, guruId, rombelId],
    queryFn: () =>
      getRekapAgendaGuru({
        data: {
          from,
          to,
          guruId: guruId === "all" ? undefined : guruId,
          rombelId: rombelId === "all" ? undefined : rombelId,
        },
      }),
    placeholderData: (prev) => prev,
  });

  const d = dataQ.data;

  const kpi = d?.kpi ?? { total: 0, masuk: 0, tidakTugas: 0, tidakTanpa: 0, withTp: 0, guruAktif: 0, rombelAktif: 0, kehadiranPct: 0 };

  const perGuruSorted = useMemo(() => d?.perGuru ?? [], [d]);

  const handleExport = () => {
    if (!d) return;
    const wb = XLSX.utils.book_new();
    const wsGuru = XLSX.utils.json_to_sheet(
      perGuruSorted.map((g: any) => ({
        Nama: g.guru_nama,
        NIP: g.guru_nip,
        Total: g.total,
        Masuk: g.masuk,
        "Tidak Masuk + Tugas": g.tidak_tugas,
        "Tidak Masuk": g.tidak_tanpa,
        "Dengan TP": g.with_tp,
      })),
    );
    XLSX.utils.book_append_sheet(wb, wsGuru, "Per Guru");
    const wsAll = XLSX.utils.json_to_sheet(
      d.rows.map((r: any) => ({
        Tanggal: r.tanggal,
        "Jam ke": r.jam_ke,
        Guru: r.guru_nama,
        NIP: r.guru_nip,
        Rombel: r.rombel_name,
        Mapel: r.mapel_nama,
        Status: r.guru_status,
        "TP": r.tp_manual,
        Materi: r.materi_detail,
      })),
    );
    XLSX.utils.book_append_sheet(wb, wsAll, "Detail");
    XLSX.writeFile(wb, `rekap-agenda-guru-${from}_${to}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" /> Rekap Agenda Guru
          </h1>
          <p className="text-muted-foreground text-sm">Analisis pelaksanaan agenda KBM guru berdasarkan rentang tanggal.</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 items-end w-full md:w-auto">
          <div>
            <div className="text-xs text-muted-foreground">Dari</div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full sm:w-40" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Sampai</div>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full sm:w-40" />
          </div>
          <Select value={guruId} onValueChange={setGuruId}>
            <SelectTrigger className="w-full sm:w-56 col-span-2 sm:col-auto"><SelectValue placeholder="Semua Guru" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Guru</SelectItem>
              {opts.guru.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={rombelId} onValueChange={setRombelId}>
            <SelectTrigger className="w-full sm:w-48 col-span-2 sm:col-auto"><SelectValue placeholder="Semua Rombel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Rombel</SelectItem>
              {opts.rombel.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => dataQ.refetch()} disabled={dataQ.isFetching} className="w-full sm:w-auto">
            <RefreshCw className={`h-4 w-4 mr-1 ${dataQ.isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={handleExport} disabled={!d} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-1" /> Excel
          </Button>
        </div>

      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard icon={<ClipboardList className="h-4 w-4" />} label="Total Agenda" value={kpi.total} />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} label="Kehadiran" value={`${kpi.kehadiranPct}%`} sub={`${kpi.masuk}/${kpi.total} sesi`} />
        <KpiCard icon={<BookOpen className="h-4 w-4 text-blue-600" />} label="Dengan TP" value={kpi.withTp} />
        <KpiCard icon={<Users className="h-4 w-4 text-purple-600" />} label="Guru Aktif" value={kpi.guruAktif} />
        <KpiCard icon={<Users className="h-4 w-4 text-orange-600" />} label="Rombel Aktif" value={kpi.rombelAktif} />
        <KpiCard icon={<AlertCircle className="h-4 w-4 text-yellow-600" />} label="Tidak Masuk + Tugas" value={kpi.tidakTugas} />
        <KpiCard icon={<XCircle className="h-4 w-4 text-red-600" />} label="Tidak Masuk" value={kpi.tidakTanpa} />
      </div>

      <Tabs defaultValue="tabel">
        <TabsList>
          <TabsTrigger value="tabel"><TableIcon className="h-4 w-4 mr-1" />Tabel</TabsTrigger>
          <TabsTrigger value="per-guru">Per Guru</TabsTrigger>
          <TabsTrigger value="detail">Detail</TabsTrigger>
        </TabsList>

        <TabsContent value="tabel">
          <TabelKehadiranGuru
            sessions={d?.sessions ?? []}
            rombelOpts={opts.rombel}
          />
        </TabsContent>

        <TabsContent value="per-guru">
          <Card>
            <CardHeader><CardTitle>Rekap Per Guru</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guru</TableHead>
                    <TableHead>NIP</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Masuk</TableHead>
                    <TableHead className="text-right">Tidak + Tugas</TableHead>
                    <TableHead className="text-right">Tidak Masuk</TableHead>
                    <TableHead className="text-right">Dengan TP</TableHead>
                    <TableHead className="text-right">Kehadiran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perGuruSorted.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Tidak ada data.</TableCell></TableRow>
                  )}
                  {perGuruSorted.map((g: any) => {
                    const pct = g.total ? Math.round((g.masuk / g.total) * 1000) / 10 : 0;
                    return (
                      <TableRow key={g.guru_id ?? g.guru_nama}>
                        <TableCell className="font-medium">{g.guru_nama}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{g.guru_nip}</TableCell>
                        <TableCell className="text-right">{g.total}</TableCell>
                        <TableCell className="text-right text-green-700">{g.masuk}</TableCell>
                        <TableCell className="text-right text-yellow-700">{g.tidak_tugas}</TableCell>
                        <TableCell className="text-right text-red-700">{g.tidak_tanpa}</TableCell>
                        <TableCell className="text-right">{g.with_tp}</TableCell>
                        <TableCell className="text-right">{pct}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detail">
          <Card>
            <CardHeader><CardTitle>Detail Agenda</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jam</TableHead>
                    <TableHead>Guru</TableHead>
                    <TableHead>Rombel</TableHead>
                    <TableHead>Mapel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>TP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(d?.rows ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Tidak ada data.</TableCell></TableRow>
                  )}
                  {(d?.rows ?? []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.tanggal}</TableCell>
                      <TableCell>{r.jam_ke}</TableCell>
                      <TableCell>{r.guru_nama}</TableCell>
                      <TableCell>{r.rombel_name}</TableCell>
                      <TableCell>{r.mapel_nama}</TableCell>
                      <TableCell>{statusBadge(r.guru_status)}</TableCell>
                      <TableCell className="max-w-xs truncate" title={r.tp_manual}>{r.tp_manual}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}<span>{label}</span></div>
        <div className="text-2xl font-bold mt-1">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function statusBadge(s: string) {
  if (s === "masuk") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Masuk</Badge>;
  if (s === "tidak_masuk_dengan_tugas") return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Tidak + Tugas</Badge>;
  if (s === "tidak_masuk_tanpa_tugas") return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Tidak Masuk</Badge>;
  return <Badge variant="secondary">{s}</Badge>;
}

type SortKey = "tanggal" | "jam" | "rombel" | "guru" | "mapel" | "status";

function TabelKehadiranGuru({ sessions, rombelOpts }: { sessions: any[]; rombelOpts: any[] }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState<string>("all");
  const [rombelF, setRombelF] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("tanggal");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [detail, setDetail] = useState<any | null>(null);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    let out = sessions.filter((x) => {
      if (statusF !== "all" && x.guru_status !== statusF) return false;
      if (rombelF !== "all" && x.rombel_id !== rombelF) return false;
      if (dateFrom && (x.tanggal ?? "") < dateFrom) return false;
      if (dateTo && (x.tanggal ?? "") > dateTo) return false;
      if (!s) return true;
      return (
        (x.guru_nama ?? "").toLowerCase().includes(s) ||
        (x.rombel_name ?? "").toLowerCase().includes(s) ||
        (x.mapel_nama ?? "").toLowerCase().includes(s)
      );
    });
    const cmp = (a: any, b: any) => {
      let va: any = "";
      let vb: any = "";
      if (sortKey === "tanggal") {
        va = `${a.tanggal ?? ""}-${String(a.jam_list[0] ?? 0).padStart(2, "0")}`;
        vb = `${b.tanggal ?? ""}-${String(b.jam_list[0] ?? 0).padStart(2, "0")}`;
      } else if (sortKey === "jam") {
        va = a.jam_list[0] ?? 0;
        vb = b.jam_list[0] ?? 0;
      } else if (sortKey === "rombel") { va = a.rombel_name; vb = b.rombel_name; }
      else if (sortKey === "guru") { va = a.guru_nama; vb = b.guru_nama; }
      else if (sortKey === "mapel") { va = a.mapel_nama; vb = b.mapel_nama; }
      else { va = a.guru_status; vb = b.guru_status; }
      const r = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? r : -r;
    };
    return [...out].sort(cmp);
  }, [sessions, search, statusF, rombelF, dateFrom, dateTo, sortKey, sortDir]);


  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
      Tanggal: r.tanggal, Jam: r.jam_label, Rombel: r.rombel_name, Guru: r.guru_nama,
      Mapel: r.mapel_nama, Status: r.guru_status, Jml: r.jml,
      H: r.hadir, S: r.sakit, I: r.izin, D: r.dispensasi, B: r.bolos, A: r.alfa,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tabel Kehadiran");
    XLSX.writeFile(wb, `tabel-kehadiran-guru.xlsx`);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2"><TableIcon className="h-5 w-5" />Tabel Kehadiran Guru</CardTitle>
            <div className="text-sm text-muted-foreground mt-1">Detail kehadiran guru per sesi pembelajaran</div>
          </div>
          <Button variant="outline" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-1" /> Export Excel
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari guru, rombel, atau mapel..." className="pl-9" />
            </div>
            <Select value={statusF} onValueChange={setStatusF}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Semua Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="masuk">Masuk</SelectItem>
                <SelectItem value="tidak_masuk_dengan_tugas">Tidak + Tugas</SelectItem>
                <SelectItem value="tidak_masuk_tanpa_tugas">Tidak Masuk</SelectItem>
              </SelectContent>
            </Select>
            <Select value={rombelF} onValueChange={setRombelF}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Semua Rombel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Rombel</SelectItem>
                {rombelOpts.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Dari</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Sampai</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>Reset</Button>
            )}


          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHead label="Tanggal" active={sortKey === "tanggal"} dir={sortDir} onClick={() => toggleSort("tanggal")} />
                  <SortHead label="Jam" active={sortKey === "jam"} dir={sortDir} onClick={() => toggleSort("jam")} />

                  <SortHead label="Rombel" active={sortKey === "rombel"} dir={sortDir} onClick={() => toggleSort("rombel")} />
                  <SortHead label="Guru" active={sortKey === "guru"} dir={sortDir} onClick={() => toggleSort("guru")} />
                  <SortHead label="Mapel" active={sortKey === "mapel"} dir={sortDir} onClick={() => toggleSort("mapel")} />
                  <SortHead label="Status" active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")} />
                  <TableHead>Jml</TableHead>
                  <TableHead className="text-green-600">H</TableHead>
                  <TableHead className="text-yellow-500">S</TableHead>
                  <TableHead className="text-blue-600">I</TableHead>
                  <TableHead className="text-purple-600">D</TableHead>
                  <TableHead className="text-orange-600">B</TableHead>
                  <TableHead className="text-red-600">A</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground">Tidak ada data.</TableCell></TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell className="whitespace-nowrap">{r.tanggal}</TableCell>
                    <TableCell>{r.jam_label}</TableCell>

                    <TableCell>{r.rombel_name}</TableCell>
                    <TableCell className="max-w-[180px] truncate" title={r.guru_nama}>{r.guru_nama}</TableCell>
                    <TableCell className="max-w-[180px] truncate" title={r.mapel_nama}>{r.mapel_nama}</TableCell>
                    <TableCell>{statusBadge(r.guru_status)}</TableCell>
                    <TableCell><Badge variant="outline">{r.jml}</Badge></TableCell>
                    <TableCell><TallyPill n={r.hadir} color="bg-green-500" /></TableCell>
                    <TableCell><TallyPill n={r.sakit} color="bg-yellow-500" /></TableCell>
                    <TableCell><TallyPill n={r.izin} color="bg-blue-500" /></TableCell>
                    <TableCell><TallyPill n={r.dispensasi} color="bg-purple-500" /></TableCell>
                    <TableCell><TallyPill n={r.bolos} color="bg-orange-500" /></TableCell>
                    <TableCell><TallyPill n={r.alfa} color="bg-red-500" /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Edit di Agenda Guru"
                          onClick={() => navigate({ to: "/pembelajaran/agenda-guru" })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Lihat detail isian"
                          onClick={() => setDetail(r)}
                        >
                          <Eye className="h-4 w-4" />
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

      <DetailDialog session={detail} onClose={() => setDetail(null)} />
    </>
  );
}

function SortHead({ label, active, dir, onClick }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void }) {
  return (
    <TableHead>
      <button className="flex items-center gap-1 hover:text-foreground" onClick={onClick}>
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? "opacity-100" : "opacity-40"} ${active && dir === "desc" ? "rotate-180" : ""}`} />
      </button>
    </TableHead>
  );
}

function TallyPill({ n, color }: { n: number; color: string }) {
  return (
    <span className={`inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full text-white text-xs font-semibold ${color}`}>
      {n}
    </span>
  );
}

function DetailDialog({ session, onClose }: { session: any | null; onClose: () => void }) {
  const getDetail = useServerFn(getAgendaDetail);
  const open = !!session;
  const dQ = useQuery({
    queryKey: ["agenda-detail-rekap", session?.key],
    queryFn: () =>
      getDetail({
        data: {
          guruId: session.guru_id,
          tanggal: session.tanggal,
          rombelId: session.rombel_id,
          mataPelajaranId: session.mapel_id,
          jamList: session.jam_list,
        },
      }),
    enabled: open && !!session?.guru_id && !!session?.rombel_id && !!session?.mapel_id,
  });

  const kehadiranMap: Record<string, string> = dQ.data?.kehadiran ?? {};
  const students: any[] = dQ.data?.students ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Isian Agenda KBM</DialogTitle>
        </DialogHeader>
        {session && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Info label="Tanggal" value={session.tanggal} />
              <Info label="Jam ke" value={session.jam_label} />
              <Info label="Rombel" value={session.rombel_name} />
              <Info label="Mapel" value={session.mapel_nama} />
              <Info label="Guru" value={session.guru_nama} />
              <Info label="NIP" value={session.guru_nip || "—"} />
              <Info label="Status" value={<>{statusBadge(session.guru_status)}</>} />
              <Info label="Jml Murid" value={String(session.jml)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldBlock label="Tujuan Pembelajaran">{session.tp_manual || <span className="text-muted-foreground">—</span>}</FieldBlock>
              <FieldBlock label="Materi / Kegiatan">{session.materi_detail || <span className="text-muted-foreground">—</span>}</FieldBlock>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldBlock label="Foto Dokumentasi">
                {session.foto_dokumentasi ? (
                  <img src={session.foto_dokumentasi} alt="Foto" className="max-h-48 rounded border" />
                ) : (
                  <span className="text-muted-foreground text-sm">Belum diunggah</span>
                )}
              </FieldBlock>
              <FieldBlock label="TTD Guru">
                {session.ttd_guru ? (
                  <img src={session.ttd_guru} alt="TTD" className="max-h-32 rounded border bg-white" />
                ) : (
                  <span className="text-muted-foreground text-sm">Belum ditandatangani</span>
                )}
              </FieldBlock>
            </div>

            <div>
              <div className="font-semibold text-sm mb-2">Kehadiran Murid ({students.length})</div>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>NIS</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dQ.isLoading && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Memuat…</TableCell></TableRow>
                    )}
                    {!dQ.isLoading && students.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Tidak ada data murid.</TableCell></TableRow>
                    )}
                    {students.map((s: any, i: number) => (
                      <TableRow key={s.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{s.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.nis}</TableCell>
                        <TableCell>{kehadiranLabel(kehadiranMap[s.id])}</TableCell>
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

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-md p-3">
      <div className="text-xs font-semibold text-muted-foreground mb-1">{label}</div>
      <div className="text-sm whitespace-pre-wrap">{children}</div>
    </div>
  );
}

function kehadiranLabel(v?: string) {
  if (!v) return <span className="text-muted-foreground text-xs">—</span>;
  const map: Record<string, { label: string; cls: string }> = {
    hadir: { label: "Hadir", cls: "bg-green-100 text-green-800" },
    sakit: { label: "Sakit", cls: "bg-yellow-100 text-yellow-800" },
    izin: { label: "Izin", cls: "bg-blue-100 text-blue-800" },
    dispensasi: { label: "Dispensasi", cls: "bg-purple-100 text-purple-800" },
    bolos_kelas: { label: "Bolos", cls: "bg-orange-100 text-orange-800" },
    alfa: { label: "Alfa", cls: "bg-red-100 text-red-800" },
  };
  const m = map[v] ?? { label: v, cls: "bg-muted" };
  return <Badge className={`${m.cls} hover:${m.cls}`}>{m.label}</Badge>;
}
