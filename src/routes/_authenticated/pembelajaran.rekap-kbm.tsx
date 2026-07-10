import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { listLaporanKbm, listLaporanKbmOptions, deleteLaporanKbm } from "@/lib/lapor-kbm.functions";
import { ListChecks, Trash2, Download } from "lucide-react";

const listQO = queryOptions({
  queryKey: ["lapor-kbm-list"],
  queryFn: () => listLaporanKbm({ data: { limit: 500 } }),
});
const optsQO = queryOptions({
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

function RekapKbmPage() {
  const { data: rows } = useSuspenseQuery(listQO);
  const { data: opts } = useSuspenseQuery(optsQO);
  const qc = useQueryClient();
  const del = useServerFn(deleteLaporanKbm);

  const [q, setQ] = useState("");
  const [rombelId, setRombelId] = useState("all");
  const [guruId, setGuruId] = useState("all");
  const [mapelId, setMapelId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r: any) => {
      if (rombelId !== "all" && r.rombel_id !== rombelId) return false;
      if (guruId !== "all" && r.guru_id !== guruId) return false;
      if (mapelId !== "all" && r.mata_pelajaran_id !== mapelId) return false;
      if (from && r.tanggal < from) return false;
      if (to && r.tanggal > to) return false;
      if (s) {
        const hay = [r.tanggal, r.rombel_name, r.mapel_name, r.guru_name, r.materi, r.capaian_pembelajaran, r.catatan]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, q, rombelId, guruId, mapelId, from, to]);

  const removeMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Laporan dihapus");
      qc.invalidateQueries({ queryKey: ["lapor-kbm-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportCsv = () => {
    const header = [
      "Tanggal", "Jam Mulai", "Jam Selesai", "Rombel", "Mapel", "Guru", "Status",
      "Hadir", "Izin", "Sakit", "Alpa", "Materi", "Capaian", "Catatan",
    ];
    const lines = [header.join(",")];
    for (const r of filtered as any[]) {
      const cells = [
        r.tanggal, r.jam_mulai, r.jam_selesai, r.rombel_name, r.mapel_name, r.guru_name, r.guru_status,
        r.jumlah_hadir, r.jumlah_izin, r.jumlah_sakit, r.jumlah_alpa,
        r.materi ?? "", r.capaian_pembelajaran ?? "", r.catatan ?? "",
      ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`);
      lines.push(cells.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rekap-kbm-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" />
            Rekap KBM
          </h1>
          <p className="text-sm text-muted-foreground">Riwayat pelaksanaan KBM yang sudah dilaporkan.</p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent className="grid gap-3 grid-cols-1 md:grid-cols-6">
          <Input placeholder="Cari..." value={q} onChange={(e) => setQ(e.target.value)} className="md:col-span-2" />
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Select value={rombelId} onValueChange={setRombelId}>
            <SelectTrigger><SelectValue placeholder="Rombel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Rombel</SelectItem>
              {opts.rombel.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={guruId} onValueChange={setGuruId}>
            <SelectTrigger><SelectValue placeholder="Guru" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Guru</SelectItem>
              {opts.guru.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={mapelId} onValueChange={setMapelId}>
            <SelectTrigger className="md:col-span-2"><SelectValue placeholder="Mapel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Mapel</SelectItem>
              {opts.mapel.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nama}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Laporan ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jam</TableHead>
                <TableHead>Rombel</TableHead>
                <TableHead>Mapel</TableHead>
                <TableHead>Guru</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">H</TableHead>
                <TableHead className="text-center">I</TableHead>
                <TableHead className="text-center">S</TableHead>
                <TableHead className="text-center">A</TableHead>
                <TableHead>Materi</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                    Belum ada laporan
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{r.tanggal}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.jam_mulai}–{r.jam_selesai}</TableCell>
                  <TableCell>{r.rombel_name}</TableCell>
                  <TableCell>{r.mapel_name}</TableCell>
                  <TableCell>{r.guru_name}</TableCell>
                  <TableCell>
                    <Badge variant={r.guru_status === "Hadir" ? "default" : "secondary"}>{r.guru_status}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{r.jumlah_hadir}</TableCell>
                  <TableCell className="text-center">{r.jumlah_izin}</TableCell>
                  <TableCell className="text-center">{r.jumlah_sakit}</TableCell>
                  <TableCell className="text-center">{r.jumlah_alpa}</TableCell>
                  <TableCell className="max-w-xs truncate">{r.materi ?? "—"}</TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Hapus laporan ini?")) removeMut.mutate(r.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
