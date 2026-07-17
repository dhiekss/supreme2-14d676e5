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
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <div className="text-xs text-muted-foreground">Dari</div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Sampai</div>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
          <Select value={guruId} onValueChange={setGuruId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Semua Guru" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Guru</SelectItem>
              {opts.guru.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={rombelId} onValueChange={setRombelId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Semua Rombel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Rombel</SelectItem>
              {opts.rombel.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => dataQ.refetch()} disabled={dataQ.isFetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${dataQ.isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={handleExport} disabled={!d}>
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
