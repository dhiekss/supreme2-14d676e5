import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listRombel } from "@/lib/presensi.functions";
import { presensiReport } from "@/lib/presensi-report.functions";
import { Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/laporan-presensi")({
  head: () => ({ meta: [{ title: "Laporan Presensi — SUPREME XPOES" }] }),
  loader: async () => ({ rombel: await listRombel() }),
  component: LaporanPresensi,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

function LaporanPresensi() {
  const { rombel } = Route.useLoaderData();
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [rombelId, setRombelId] = useState("");
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);

  const fetchReport = useServerFn(presensiReport);
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["presensi-report", rombelId, from, to],
    queryFn: () => fetchReport({ data: { rombelId, from, to } }),
    enabled: false,
  });

  const run = () => {
    if (!rombelId) return toast.error("Pilih rombel");
    refetch();
  };

  const exportCsv = () => {
    if (!data) return;
    const header = ["NIS", "Nama", "H", "S", "I", "A", "% Hadir"];
    const totalDays = data.totalDays || 1;
    const rows = data.students.map((s) => [
      s.nis ?? "",
      s.name ?? "",
      s.H,
      s.S,
      s.I,
      s.A,
      `${((s.H / totalDays) * 100).toFixed(1)}%`,
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const rName = rombel.find((r: any) => r.id === rombelId)?.name ?? "rombel";
    a.href = url;
    a.download = `laporan-presensi-${rName}-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Laporan Presensi</h1>
        <p className="text-sm text-muted-foreground">Rekap kehadiran per rombel & rentang tanggal.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Rombel</Label>
              <Select value={rombelId} onValueChange={setRombelId}>
                <SelectTrigger><SelectValue placeholder="Pilih rombel" /></SelectTrigger>
                <SelectContent>
                  {rombel.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dari</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sampai</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={run} disabled={isFetching}>{isFetching ? "Memuat..." : "Tampilkan"}</Button>
            {data && (
              <Button variant="outline" onClick={exportCsv}>
                <Download className="h-4 w-4 mr-1" /> Ekspor CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Rekap — {data.students.length} siswa, {data.totalDays} hari tercatat
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NIS</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="text-center">H</TableHead>
                  <TableHead className="text-center">S</TableHead>
                  <TableHead className="text-center">I</TableHead>
                  <TableHead className="text-center">A</TableHead>
                  <TableHead className="text-right">% Hadir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.students.map((s) => {
                  const pct = data.totalDays ? (s.H / data.totalDays) * 100 : 0;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{s.nis ?? "—"}</TableCell>
                      <TableCell>{s.name}</TableCell>
                      <TableCell className="text-center">{s.H}</TableCell>
                      <TableCell className="text-center">{s.S}</TableCell>
                      <TableCell className="text-center">{s.I}</TableCell>
                      <TableCell className="text-center">{s.A}</TableCell>
                      <TableCell className={`text-right font-medium ${pct < 75 ? "text-destructive" : ""}`}>
                        {pct.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
